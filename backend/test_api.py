import os
import google.generativeai as genai
from dotenv import load_dotenv

# Load your new API key
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=api_key)

print("🔍 Asking Google for available models...")

try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"✅ Found model: {m.name}")
except Exception as e:
    print(f"🚨 Connection Failed: {e}")