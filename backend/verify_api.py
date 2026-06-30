import sys
sys.path.insert(0, '.')
try:
    import fastapi
    import uvicorn
    import pydantic
    print("fastapi:", fastapi.__version__)
    print("uvicorn:", uvicorn.__version__)
    print("pydantic:", pydantic.__version__)
    from api import app
    print("API module OK - routes:", [r.path for r in app.routes[:5]])
except ImportError as e:
    print("Import error:", e)
except Exception as e:
    print("Error:", e)
