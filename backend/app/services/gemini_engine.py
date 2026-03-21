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
        You are a premium Chicago concierge. Generate a 3-step itinerary based on the user constraints.
        
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
        1. Look at the "Current Weather" and the "Transit" choice. Write a 1-sentence 'outfit_tip' suggesting what the user should wear to stay comfortable and fit the vibe.
        2. Keep location descriptions short (Max 12 words).
        3. Return ONLY valid JSON.

        JSON SCHEMA:
        {{
          "title": "string",
          "vibe": "string",
          "weather": "string",
          "outfit_tip": "string",
          "plan": [
            {{
              "time": "string",
              "title": "string",
              "place": "string",
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