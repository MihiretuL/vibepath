import os
import google.generativeai as genai
from dotenv import load_dotenv

# 1. Load the variables from the .env file
load_dotenv()

# 2. Look for the LABEL "GEMINI_API_KEY" inside the .env file
api_key = os.getenv("GEMINI_API_KEY")

def generate_vibe_itinerary(user_prompt: str) -> str:
    # 3. Check if we actually found the key
    if not api_key:
        return "Error: Could not find 'GEMINI_API_KEY' in your .env file."
    
    try:
        genai.configure(api_key=api_key)
        
        # 4. Use the full model path for Gemini 1.5 Flash
        model = genai.GenerativeModel('models/gemini-1.5-flash')
        
        system_instruction = "You are a premium Chicago concierge. Give a 3-step local itinerary for the vibe: "
        
        response = model.generate_content(f"{system_instruction} {user_prompt}")
        return response.text
        
    except Exception as e:
        return f"Gemini Error: {str(e)}"