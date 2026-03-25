import os
import requests
from datetime import datetime
import json
import stripe
from fastapi import FastAPI, Request, HTTPException 
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from supabase import create_client, Client
from typing import Optional
from app.services.gemini_engine import generate_vibe_itinerary

# Load environment variables (This grabs your URL and Key!)
load_dotenv()

app = FastAPI(title="Pathzu API")

# The CORS Unlocker
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Supabase Connection
supabase_url: str = os.getenv("SUPABASE_URL")
supabase_key: str = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

# Initialize Stripe Connection
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

# --- DATA MODELS ---

class VibeRequest(BaseModel):
    timing: str
    transit: str
    distance: str
    party: str
    budget: str
    mood: str
    prompt: str
    time_context: str
    location: str
    user_id: Optional[str] = None  # Allows the frontend to pass the user's ID!

class CheckoutRequest(BaseModel):
    user_id: str

# --- ENDPOINTS ---

@app.post("/api/route")
async def generate_route(req: VibeRequest):
    print("🚨 THE FRONTEND KNOCKED ON THE DOOR!")

    # 1. 🛑 THE BOUNCER: Check if they are logged in
    if not req.user_id:
        return {"reply": json.dumps({"error": "Please Sign In to generate a route."})}

    try:
        # 2. 🗄️ THE VAULT: Check their profile in Supabase
        profile_res = supabase.table("profiles").select("is_pro, routes_generated").eq("id", req.user_id).execute()
        
        is_pro = False
        routes_generated = 0

        if len(profile_res.data) > 0:
            user_profile = profile_res.data[0]
            is_pro = user_profile.get("is_pro") or False
            routes_generated = user_profile.get("routes_generated") or 0
        else:
            # 🚨 THE FIX: If they don't have a profile row yet, create one right now!
            print(f"🛠️ Creating missing profile row for user {req.user_id}")
            supabase.table("profiles").insert({
                "id": req.user_id, 
                "is_pro": False, 
                "routes_generated": 0
            }).execute()

        # 3. 💸 THE PAYWALL: Block them if they hit the limit!
        if not is_pro and routes_generated >= 2:
            print(f"🔒 PAYWALL HIT: User {req.user_id} is out of free routes.")
            return {"reply": json.dumps({
                "error": "PAYWALL_HIT", 
                "message": "You've reached your limit of 2 free routes! Please upgrade to Pro to unlock unlimited generations."
            }), "route_id": None}
        
        # 4. 🔢 THE COUNTER: Add +1 if they are on the free tier
        if not is_pro:
            print(f"✅ Counting route {routes_generated + 1} for free user {req.user_id}")
            supabase.table("profiles").update({
                "routes_generated": routes_generated + 1
            }).eq("id", req.user_id).execute()

    except Exception as e:
        print(f"❌ Database check completely failed: {e}")
    
    # 5. Ask Gemini to build the route
    raw_itinerary = generate_vibe_itinerary(req)
    
    try:
        # 6. Parse the text back into a Python dictionary
        itinerary_data = json.loads(raw_itinerary)
        
        # 7. Save the payload securely to Supabase
        print("💾 Saving route to PostgreSQL database...")
        
        insert_data = {
            "title": itinerary_data.get("title", "Pathzu Route"),
            "vibe": req.mood or req.prompt,
            "full_json": itinerary_data
        }
        
        # If they are logged in, link the route to their account!
        if req.user_id:
            insert_data["user_id"] = req.user_id

        db_response = supabase.table("itineraries").insert(insert_data).execute()
        
        # 8. Extract the brand new, unique URL ID
        route_id = db_response.data[0]['id']
        print(f"✅ Route securely saved! ID: {route_id}")
        
        # 9. Send both the itinerary AND the new ID back to React
        return {"reply": raw_itinerary, "route_id": route_id}
        
    except Exception as e:
        print(f"❌ Database Error: {e}")
        # Fallback: If the DB goes down, still give the user their route!
        return {"reply": raw_itinerary, "route_id": None}

# 🚨 The "Read" Endpoint for Shared Links
@app.get("/api/route/{route_id}")
async def get_shared_route(route_id: str):
    print(f"👀 Someone is looking at shared route: {route_id}")
    try:
        # Ask Supabase for the specific itinerary
        db_response = supabase.table("itineraries").select("*").eq("id", route_id).execute()
        
        if not db_response.data:
            return {"error": "Route not found. It may have expired or been deleted."}
            
        return {"success": True, "data": db_response.data[0]}
        
    except Exception as e:
        print(f"❌ Read Error: {e}")
        return {"error": "Could not retrieve the shared route."}

# 🚨 The Monetization Endpoint
@app.post("/api/checkout")
async def create_checkout_session(req: CheckoutRequest):
    print(f"💸 User {req.user_id} clicked GO PRO!")
    try:
        # Ask Stripe to build a secure, hosted checkout page
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': 'Pathzu Pro (Unlimited Pass)',
                        'description': 'Unlock unlimited daily routes, hidden speakeasies, and premium concierge features.',
                    },
                    'unit_amount': 499, # $4.99 (Stripe reads everything in cents!)
                },
                'quantity': 1,
            }],
            mode='payment',
            # Where Stripe sends them after they swipe their card:
            success_url="http://localhost:3000/?payment=success",
            cancel_url="http://localhost:3000/?payment=cancelled",
            # THE SECRET SAUCE: Attach the user_id to the Stripe receipt!
            client_reference_id=req.user_id 
        )
        print(f"✅ Stripe Checkout URL Generated!")
        return {"checkout_url": session.url}
        
    except Exception as e:
        print(f"❌ Stripe Error: {e}")
        return {"error": str(e)}

@app.get("/api/events")
async def get_frontend_events(city: str = "Chicago"):
    tm_key = os.getenv("TICKETMASTER_API_KEY")
    if not tm_key:
        return {"events": []}
        
    try:
        now_iso = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
        # 🚨 CHANGED: size=10 to grab more events!
        url = f"https://app.ticketmaster.com/discovery/v2/events.json?apikey={tm_key}&city={city}&startDateTime={now_iso}&sort=date,asc&size=10"
        
        response = requests.get(url, timeout=5)
        data = response.json()
        
        if response.status_code != 200 or "_embedded" not in data:
            return {"events": []}
            
        events = data["_embedded"]["events"]
        event_list = []
        for e in events:
            name = e.get("name", "Unknown Event")
            venues = e.get("_embedded", {}).get("venues", [{}])
            venue_name = venues[0].get("name", "Unknown Venue")
            
            # 🚨 NEW: Grab the time and format it (e.g. 19:30:00 -> 7:30 PM)
            raw_time = e.get("dates", {}).get("start", {}).get("localTime", "")
            display_time = "Time TBD"
            if raw_time:
                try:
                    time_obj = datetime.strptime(raw_time, "%H:%M:%S")
                    display_time = time_obj.strftime("%I:%M %p").lstrip("0")
                except:
                    display_time = raw_time

            event_list.append({"name": name, "venue": venue_name, "time": display_time})
            
        return {"events": event_list}
    except Exception as e:
        print(f"Error fetching frontend events: {e}")
        return {"events": []}

# 🚨 The Webhook Engine (Listens for Stripe's Secret Ping)
@app.post("/api/webhook")
async def stripe_webhook(request: Request):
    # 1. Grab the raw data and the security signature from Stripe
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

    try:
        # 2. Verify the message is actually from Stripe and not a hacker
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        raise HTTPException(status_code=400, detail="Invalid signature")

    # 3. Listen specifically for the "Payment Successful" event
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        
        # 4. Grab the user_id we secretly attached to the receipt!
        user_id = session.get('client_reference_id')

        if user_id:
            print(f"🎉 MONEY IN THE BANK! Upgrading user {user_id} to PRO...")
            
            try:
                # 5. Flip the switch in the Supabase database!
                supabase.table("profiles").upsert({
                    "id": user_id,
                    "is_pro": True
                }).execute()
                print("✅ User successfully upgraded in the database!")
            except Exception as e:
                print(f"❌ Failed to update Supabase: {e}")

    # Always return a 200 OK so Stripe knows we received the message
    return {"status": "success"}