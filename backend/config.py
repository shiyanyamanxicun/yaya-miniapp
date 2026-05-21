import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
if not ANTHROPIC_API_KEY:
    raise RuntimeError("请在 .env 文件中设置 ANTHROPIC_API_KEY")

DATABASE_PATH = BASE_DIR / "data" / "sadness_aid.db"
CLAUDE_MODEL = "claude-sonnet-4-20250514"
MAX_TOKENS = 300
TEMPERATURE = 0.85
