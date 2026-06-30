import os, requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")
api_key = os.environ.get("GEMINI_API_KEY", "")

# Try models in order of cost - cheapest/lite first
models = [
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash-lite-001",
    "gemini-2.5-flash",
    "gemini-2.0-flash-001",
    "gemini-2.0-flash",
]

for model in models:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    resp = requests.post(
        url,
        headers={"Content-Type": "application/json", "X-goog-api-key": api_key},
        json={"contents": [{"parts": [{"text": "Say hi in one sentence."}]}]},
        timeout=15
    )
    if resp.ok:
        text = resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
        print(f"WORKING: {model}")
        print(f"Reply: {text}")
        break
    else:
        code = resp.status_code
        msg = resp.json().get("error", {}).get("message", "")[:80]
        print(f"FAIL {model}: {code} -- {msg}")
