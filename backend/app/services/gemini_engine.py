import os
import requests
from dotenv import load_dotenv
from datetime import datetime

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

def get_live_events(location_string: str) -> str:
    """Silently fetches live events happening nearby."""
    print(f"🎸 Checking Live Events for: {location_string}")
    tm_key = os.getenv("TICKETMASTER_API_KEY")
    
    if not tm_key:
        return "No live event data available."

    try:
        # 🚨 THE BUG FIX: We explicitly lock the city to Chicago so GPS coordinates 
        # or "IL" don't confuse the Ticketmaster API!
        city = "Chicago" 
        
        # Force Ticketmaster to only look at events happening from right NOW onward
        now_iso = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
        
        # Call Ticketmaster's Discovery API
        url = f"https://app.ticketmaster.com/discovery/v2/events.json?apikey={tm_key}&city={city}&startDateTime={now_iso}&sort=date,asc&size=3"
        
        response = requests.get(url, timeout=5)
        data = response.json()

        if response.status_code != 200:
            print(f"❌ Ticketmaster API Error: {response.status_code}")
            return "Live event data currently offline."

        # Parse the events
        if "_embedded" in data and "events" in data["_embedded"]:
            events = data["_embedded"]["events"]
            event_list = []
            
            for e in events:
                name = e.get("name", "Unknown Event")
                venues = e.get("_embedded", {}).get("venues", [{}])
                venue_name = venues[0].get("name", "Unknown Venue") if venues else "Unknown Venue"
                event_list.append(f"- {name} at {venue_name}")
            
            pulse = "\n".join(event_list)
            print(f"📡 Event Pulse Grabbed:\n{pulse}")
            return pulse
        else:
            print("📡 Event Pulse: Ticketmaster returned zero events for Chicago today.")
            return "No major ticketed events found today."
            
    except Exception as e:
        print(f"❌ Event Pulse Failed: {e}")
        return "Live event data currently offline."

def generate_vibe_itinerary(req) -> str:
    if not api_key:
        return '{"error": "Could not find GEMINI_API_KEY."}'
    
    try:
        # 2. INITIALIZE THE NEW CLIENT
        client = genai.Client(api_key=api_key)
        
        # 3. GRAB THE LIVE DATA PULSE
        current_weather = get_live_weather()
        live_events = get_live_events(req.location) # 🚨 Fetching events!
        
        system_instruction = f"""
        You are a premium Chicago concierge. Generate a 3-step route based strictly on the user constraints.
        
        USER CONTEXT:
        - Current Local Time: {req.time_context}
        - Current Weather: {current_weather}
        - 🚨 LIVE CITY EVENTS TODAY: 
        {live_events}
        - When: {req.timing}
        - Transit: {req.transit}
        - Radius: {req.distance}
        - Party: {req.party}
        - Budget: {req.budget}
        - Mood: {req.mood}
        - Specifics: {req.prompt}

        CRITICAL RULES:
        1. VIBE AWARENESS: If the Mood is "Walking Route", "Running Route", or "Walk Dog", the steps MUST focus on physical paths, parks, lakefront trails, or scenic architectural streets. Do NOT just list three restaurants. The movement is the main event. You may end with a casual coffee/drink if appropriate, but steps 1 and 2 must be the route itself.
        2. EVENT AWARENESS: Look at the LIVE CITY EVENTS. If an event matches the user's mood (e.g., "Turn Up" and there is a concert), try to build the itinerary around attending or pre-gaming that event! If the user wants a quiet vibe ("Reset Mind"), route them AWAY from those event venues to avoid crowds.
        3. STRICT TRANSIT: The user selected "{req.transit}". Do NOT mention driving or parking if they chose Walk/CTA. Do NOT mention the CTA/trains if they chose Walk or Drive. 
        4. WEATHER AWARENESS: Write a 1-sentence 'outfit_tip' suggesting what to wear specifically for "{req.transit}" in "{current_weather}".
        5. Keep location descriptions short (Max 15 words).
        6. Return ONLY valid JSON.

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
        
        # 4. USE THE NEW GENERATION METHOD
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