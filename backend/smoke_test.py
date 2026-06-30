from dotenv import load_dotenv
from pathlib import Path
import os

load_dotenv(Path(__file__).parent / ".env")
key = os.environ.get("GEMINI_API_KEY", "")
print("Key loaded:", bool(key))
print("Prefix    :", key[:12] + "..." if key else "MISSING")

# Also verify api module imports cleanly
import sys
sys.path.insert(0, str(Path(__file__).parent))
from api import app
routes = [r.path for r in app.routes if hasattr(r, "path")]
print("API routes:", [r for r in routes if "/api" in r])
