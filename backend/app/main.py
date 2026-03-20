from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
# This line connects our main file to the AI engine we built
from app.services.gemini_engine import generate_vibe_itinerary

app = FastAPI(title="Vibepath API")

# The "Open Door" policy so your browser doesn't block the request
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# This defines the "package" we expect from the frontend
class VibeRequest(BaseModel):
    prompt: str

@app.get("/")
def home():
    return {"status": "online", "engine": "Vibepath V1"}

@app.post("/api/route")
async def get_route(request: VibeRequest):
    """
    This is the main nerve center. 
    It receives the vibe, sends it to Gemini, and returns the itinerary.
    """
    print(f"--- 🚀 ROUTING TO GEMINI: {request.prompt} ---")
    
    # 1. Call the AI engine
    ai_itinerary = generate_vibe_itinerary(request.prompt)
    
    # 2. Print the result to your terminal for debugging
    print(f"--- ✅ GEMINI RESPONDED ---")
    
    # 3. Send the final plan back to your purple UI
    return {"reply": ai_itinerary}