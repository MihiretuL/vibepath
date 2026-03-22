import os
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

app = FastAPI(title="Vibepath API")

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
    
    # 1. Ask Gemini to build the route
    raw_itinerary = generate_vibe_itinerary(req)
    
    try:
        # 2. Parse the text back into a Python dictionary
        itinerary_data = json.loads(raw_itinerary)
        
        # 3. Save the payload securely to Supabase
        print("💾 Saving route to PostgreSQL database...")
        
        insert_data = {
            "title": itinerary_data.get("title", "VibePath Route"),
            "vibe": req.mood or req.prompt,
            "full_json": itinerary_data
        }
        
        # If they are logged in, link the route to their account!
        if req.user_id:
            insert_data["user_id"] = req.user_id

        db_response = supabase.table("itineraries").insert(insert_data).execute()
        
        # 4. Extract the brand new, unique URL ID
        route_id = db_response.data[0]['id']
        print(f"✅ Route securely saved! ID: {route_id}")
        
        # 5. Send both the itinerary AND the new ID back to React
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
                        'name': 'VibePath Pro (Unlimited Pass)',
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