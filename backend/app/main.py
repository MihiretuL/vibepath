import asyncio 
import os
import requests
from datetime import datetime, timedelta, timezone
import json
import stripe
import io
from fastapi import FastAPI, Request, HTTPException 
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from supabase import create_client, Client
from typing import Optional
from app.services.gemini_engine import generate_vibe_itinerary, swap_spot_with_ai, parse_city
from typing import Dict, Any # Make sure this is imported at the top!

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
    city: str = "Chicago, IL"  # Defaults to Chicago for older clients
    user_id: Optional[str] = None  # Allows the frontend to pass the user's ID!
class SwapRequest(BaseModel):
    vibe: str
    spot_to_replace: Dict[str, Any]
    current_route: Dict[str, Any]

class CheckoutRequest(BaseModel):
    user_id: str

# --- ENDPOINTS ---
@app.get("/api/photo")
def proxy_place_photo(reference: str):
    """Securely asks Google for the final image URL and redirects the browser."""
    api_key = os.getenv("GOOGLE_PLACES_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="API key configuration missing")
        
    # The initial URL with the secret key
    google_url = f"https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference={reference}&key={api_key}"
    
    try:
        # allow_redirects=False lets us catch the safe URL without downloading the heavy image!
        response = requests.get(google_url, allow_redirects=False, timeout=5)
        
        # Google responds with a 302 Found and the actual safe image URL in the 'Location' header
        if response.status_code in (301, 302) and "Location" in response.headers:
            safe_url = response.headers["Location"]
            return RedirectResponse(url=safe_url)
        else:
            print(f"❌ Google Proxy Failed: Status {response.status_code}")
            raise HTTPException(status_code=500, detail="Failed to get redirect URL from Google")
            
    except Exception as e:
        print(f"❌ Proxy Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/route")
async def generate_route(req: VibeRequest):
    print("🚨 THE FRONTEND KNOCKED ON THE DOOR!")

    # 1. 🛑 THE BOUNCER: Check if they are logged in
    if not req.user_id:
        return {"reply": json.dumps({"error": "Please Sign In to generate a route."})}

    try:
        # 2. 🗄️ THE VAULT: Check their profile in Supabase


        # 2. 🗄️ THE VAULT: Check their profile in Supabase
        profile_res = supabase.table("profiles").select("is_pro, routes_generated, tourist_pass_expires_at").eq("id", req.user_id).execute()
        
        is_pro = False
        routes_generated = 0
        has_active_tourist_pass = False

        if len(profile_res.data) > 0:
            user_profile = profile_res.data[0]
            is_pro = user_profile.get("is_pro") or False
            routes_generated = user_profile.get("routes_generated") or 0
            
            # 🚨 NEW: Check if they have an active tourist pass!
            expires_at_str = user_profile.get("tourist_pass_expires_at")
            if expires_at_str:
                # Convert the database string to a real Python datetime object
                expires_at = datetime.fromisoformat(expires_at_str.replace("Z", "+00:00"))
                now = datetime.now(timezone.utc)
                if expires_at > now:
                    has_active_tourist_pass = True
        else:
            print(f"🛠️ Creating missing profile row for user {req.user_id}")
            supabase.table("profiles").insert({
                "id": req.user_id, 
                "is_pro": False, 
                "routes_generated": 0
            }).execute()

        # 3. 💸 THE PAYWALL: Block them if they have no pro, no pass, and hit the limit!
        if not is_pro and not has_active_tourist_pass and routes_generated >= 2:
            print(f"🔒 PAYWALL HIT: User {req.user_id} is out of free routes.")
            return {"reply": json.dumps({
                "error": "PAYWALL_HIT", 
                "message": "You've reached your limit! Upgrade to a Local Pass or a 10-Day Tourist Pass to keep exploring."
            }), "route_id": None}


        
        # 4. 🔢 THE COUNTER: Add +1 if they are on the free tier
        if not is_pro:
            print(f"✅ Counting route {routes_generated + 1} for free user {req.user_id}")
            supabase.table("profiles").update({
                "routes_generated": routes_generated + 1
            }).eq("id", req.user_id).execute()

    except Exception as e:
        print(f"❌ Database check completely failed: {e}")
    
    # 5. Ask Gemini to build the route (WITH AUTO-RETRY)
    max_retries = 3
    raw_itinerary = None
    
    for attempt in range(max_retries):
        try:
            print(f"🤖 Asking AI for route (Attempt {attempt + 1}/{max_retries})...")
            # Try to get the route
            raw_itinerary = generate_vibe_itinerary(req)
            
            # If it works perfectly, break out of the retry loop!
            break 
            
        except Exception as e:
            print(f"⚠️ AI hiccup (503 or timeout): {e}")
            if attempt < max_retries - 1:
                print("🔄 Waiting 2 seconds and trying again...")
                await asyncio.sleep(2)  # Pause before hitting the AI again
            else:
                print("❌ AI completely failed after 3 attempts.")
                # The Graceful Catch: Tell the frontend the AI is busy, don't crash!
                return {
                    "reply": json.dumps({"error": "The AI concierge is currently assisting too many users! Please try again in 30 seconds."}), 
                    "id": None,
                    "route_id": None
                }
    
    try:
        # 6. Parse the text back into a Python dictionary
        itinerary_data = json.loads(raw_itinerary)

        # Remember the city so shared routes and vault items stay city-aware
        if "error" not in itinerary_data:
            itinerary_data["city"] = req.city
            raw_itinerary = json.dumps(itinerary_data)

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
        
        # 9. Send BOTH names back just to be completely bulletproof
        return {
            "reply": raw_itinerary, 
            "id": route_id,         
            "route_id": route_id
        }
        
    except Exception as e:
        print(f"❌ DATABASE ERROR (The button will be hidden!): {e}")
        # Fallback: If the DB fails, still give the user their route!
        return {
            "reply": raw_itinerary, 
            "id": None, 
            "route_id": None
        }

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
            success_url="https://pathzu.com/",
            cancel_url="https://pathzu.com/",
            # THE SECRET SAUCE: Attach the user_id to the Stripe receipt!
            client_reference_id=req.user_id 
        )
        print(f"✅ Stripe Checkout URL Generated!")
        return {"checkout_url": session.url}
        
    except Exception as e:
        print(f"❌ Stripe Error: {e}")
        return {"error": str(e)}

@app.get("/api/events")
async def get_frontend_events(city: str = "Chicago, IL"):
    tm_key = os.getenv("TICKETMASTER_API_KEY")
    if not tm_key:
        return {"events": []}

    try:
        now_iso = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
        # "Austin, TX" -> city="Austin", stateCode="TX"
        city_name, state_code = parse_city(city)
        params = {
            "apikey": tm_key,
            "city": city_name,
            "startDateTime": now_iso,
            "sort": "date,asc",
            "size": 10,
        }
        if state_code:
            params["stateCode"] = state_code

        response = requests.get("https://app.ticketmaster.com/discovery/v2/events.json", params=params, timeout=5)
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

# 1. Update the door so Stripe can find it!
# 🚨 The Webhook Engine (Listens for Stripe's Secret Ping)
@app.post("/api/webhook/stripe")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        user_id = session.get('client_reference_id')
        amount_paid = session.get('amount_total') # This tells us what they bought!

        if user_id:
            try:
                # Did they buy the $9.99 Tourist Pass?
                if amount_paid == 999:
                    print(f"✈️ TOURIST PASS SOLD! Granting 10 days to {user_id}...")
                    
                    now = datetime.now(timezone.utc)
                    expiration_date = now + timedelta(days=10)
                    
                    supabase.table("profiles").upsert({
                        "id": user_id,
                        "tourist_pass_expires_at": expiration_date.isoformat()
                    }).execute()
                    
                # Otherwise, they bought the $4.99 Monthly Pro Pass!
                else:
                    print(f"🎉 PRO MONTHLY SOLD! Upgrading user {user_id}...")
                    supabase.table("profiles").upsert({
                        "id": user_id,
                        "is_pro": True
                    }).execute()
                    
                print("✅ Database successfully updated via Webhook!")
            except Exception as e:
                print(f"❌ Failed to update Supabase: {e}")

    return {"status": "success"}

    # Always return a 200 OK so Stripe knows we received the message
   
# 🚨 The Swapping Endpoint
@app.post("/api/swap")
async def swap_route_spot(req: SwapRequest):
    print(f"🔄 SWAP INITIATED! Looking for a new spot for vibe: {req.vibe}")
    
    try:
        # Ask Gemini for the replacement (We will build this function next!)
        new_spot = swap_spot_with_ai(req)
        
        # Log the success
        spot_name = new_spot.get('title', 'Unknown Spot')
        print(f"✅ AI found a replacement: {spot_name}")
        
        return new_spot
        
    except Exception as e:
        print(f"❌ Swap failed: {e}")
        return {"error": "Failed to generate a new spot."}