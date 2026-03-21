from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from app.services.gemini_engine import generate_vibe_itinerary

app = FastAPI(title="Vibepath API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. The Expanded Data Contract
# This exactly matches the 'payload' we built in Next.js
class VibeRequest(BaseModel):
    timing: str
    transit: str
    distance: str
    party: str
    budget: str
    mood: Optional[str] = ""   # Optional because they might not click a pin
    prompt: Optional[str] = "" # Optional because they might leave the text box blank
    time_context: str
    location: str 

@app.get("/")
def home():
    return {"status": "online", "engine": "Vibepath V1"}
 
@app.post("/api/route")
def get_route(request: VibeRequest): 
    print(f"--- 🚀 ROUTING CONTEXT: {request.party} | {request.budget} | {request.transit} ---")
    
    # 2. Pass the ENTIRE request object to the AI engine
    ai_itinerary = generate_vibe_itinerary(request)
    
    print(f"--- ✅ GEMINI RESPONDED ---")
    return {"reply": ai_itinerary}