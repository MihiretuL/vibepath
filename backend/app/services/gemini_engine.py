import os
import requests
from dotenv import load_dotenv

# 1. NEW SDK IMPORTS
from google import genai
from google.genai import types

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
weather_key = os.getenv("WEATHER_API_KEY")

def get_live_weather():
    """Silently fetches the current Chicago weather behind the scenes."""
    if not weather_key:
        return "Weather unavailable."
    try:
        url = f"http://api.weatherapi.com/v1/current.json?key={weather_key}&q=Chicago"
        response = requests.get(url, timeout=5).json()
        temp = response['current']['temp_f']
        condition = response['current']['condition']['text']
        return f"{temp}°F and {condition}"
    except Exception:
        return "Weather unavailable."

def generate_vibe_itinerary(req) -> str:
    if not api_key:
        return '{"error": "Could not find GEMINI_API_KEY."}'
    
    try:
        # 2. INITIALIZE THE NEW CLIENT
        client = genai.Client(api_key=api_key)
        
        current_weather = get_live_weather()
        
        system_instruction = f"""
        You are a premium Chicago concierge. Generate a 3-step route based strictly on the user constraints.
        
        USER CONTEXT:
        - Current Local Time: {req.time_context}
        - Current Weather: {current_weather}
        - When: {req.timing}
        - Transit: {req.transit}
        - Radius: {req.distance}
        - Party: {req.party}
        - Budget: {req.budget}
        - Mood: {req.mood}
        - Specifics: {req.prompt}

        CRITICAL RULES:
        1. VIBE AWARENESS: If the Mood is "Walking Route", "Running Route", or "Walk Dog", the steps MUST focus on physical paths, parks, lakefront trails, or scenic architectural streets. Do NOT just list three restaurants. The movement is the main event. You may end with a casual coffee/drink if appropriate, but steps 1 and 2 must be the route itself.
        2. STRICT TRANSIT: The user selected "{req.transit}". Do NOT mention driving or parking if they chose Walk/CTA. Do NOT mention the CTA/trains if they chose Walk or Drive. 
        3. WEATHER AWARENESS: Write a 1-sentence 'outfit_tip' suggesting what to wear specifically for "{req.transit}" in "{current_weather}".
        4. Keep location descriptions short (Max 15 words).
        5. Return ONLY valid JSON.

        JSON SCHEMA:
        {{
          "title": "string (Catchy title)",
          "vibe": "string",
          "weather": "string (Repeat the Current Weather)",
          "outfit_tip": "string",
          "plan": [
            {{
              "time": "string",
              "title": "string (Actionable step)",
              "place": "string (Specific path, park, or venue)",
              "description": "string",
              "action": "string"
            }}
          ]
        }}
        """
        
        # 3. USE THE NEW GENERATION METHOD
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=system_instruction,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            )
        )
        
        return response.text
        
    except Exception as e:
        return f'{{"error": "Gemini Error: {str(e)}"}}'