import os
import json
import requests
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
weather_key = os.getenv("WEATHER_API_KEY")
google_api_key = os.getenv("GOOGLE_API_KEY")

def get_live_weather():
    """Silently fetches current weather behind the scenes."""
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

def get_place_image(place_name, location_context):
    """Reaches out to Google Places API to grab a real photo of the venue."""
    if not google_api_key:
        return None
    
    # 1. Ask Google to find the specific place and return its hidden "photo_reference" ID
    search_url = f"https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input={place_name} {location_context}&inputtype=textquery&fields=photos&key={google_api_key}"
    
    try:
        response = requests.get(search_url, timeout=5).json()
        
        # If Google found the place AND it has photos...
        if response.get('candidates') and response['candidates'][0].get('photos'):
            photo_ref = response['candidates'][0]['photos'][0]['photo_reference']
            
            # 2. Construct the final image URL that React can display
            photo_url = f"https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference={photo_ref}&key={google_api_key}"
            return photo_url
            
    except Exception as e:
        print(f"--- ⚠️ Failed to fetch image for {place_name}: {e} ---")
        
    return None

def generate_vibe_itinerary(req) -> str:
    if not api_key:
        return '{"error": "Could not find GEMINI_API_KEY."}'
    
    try:
        client = genai.Client(api_key=api_key)
        current_weather = get_live_weather()
        
        system_instruction = f"""
        You are a premium city concierge. Generate a 3-step itinerary based on the user constraints.
        
        USER CONTEXT:
        - Current Local Time: {req.time_context}
        - Current Weather: {current_weather}
        - Starting Location: {req.location}
        - When: {req.timing}
        - Transit: {req.transit}
        - Radius: {req.distance}
        - Party: {req.party}
        - Budget: {req.budget}
        - Mood: {req.mood}
        - Specifics: {req.prompt}

        CRITICAL RULES:
        1. Write a 1-sentence 'outfit_tip' based on the weather.
        2. Keep location descriptions short (Max 15 words).
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
              "description": "string"
            }}
          ]
        }}
        """
        
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=system_instruction,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            )
        )
        
        # --- 🚀 THE INTERCEPTOR: Adding real images before sending to React ---
        raw_text = response.text
        
        # Clean up Markdown if Gemini accidentally included it
        if raw_text.startswith("```json"):
            raw_text = raw_text.replace("```json\n", "").replace("```", "").strip()
            
        itinerary_data = json.loads(raw_text)
        
        print("--- 📸 FETCHING REAL IMAGES FROM GOOGLE... ---")
        for step in itinerary_data.get('plan', []):
            place_name = step.get('place', '')
            if place_name:
                # Fetch the image using the place name and the city they are in
                real_image_url = get_place_image(place_name, req.location)
                if real_image_url:
                    step['image_url'] = real_image_url
                    print(f"✅ Found image for: {place_name}")
                else:
                    print(f"❌ No image found for: {place_name}")
                    
        # Turn the Python dictionary back into a JSON string and send it to React
        return json.dumps(itinerary_data)
        
    except Exception as e:
        return f'{{"error": "Backend Engine Error: {str(e)}"}}'