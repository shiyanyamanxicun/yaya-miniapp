import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
if not ANTHROPIC_API_KEY:
    print("WARNING: ANTHROPIC_API_KEY not set, AI features will use local fallback")

DATABASE_PATH = BASE_DIR / "data" / "sadness_aid.db"
CLAUDE_MODEL = "claude-sonnet-4-20250514"
MAX_TOKENS = 300
TEMPERATURE = 0.85
