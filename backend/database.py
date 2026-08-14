import os
from pathlib import Path
from dotenv import load_dotenv
# Load .env from the project root (one level above the backend/ folder)
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=_env_path, override=True)

from sqlmodel import SQLModel, create_engine, Session

DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://neondb_owner:npg_4mVc2ofvzZDe@ep-calm-art-axkp2aj4.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require"
)

# Convert scheme to use the pure-Python pg8000 driver to bypass compilation errors on Windows (Python 3.13)
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+pg8000://")

connect_args = {}

# Handle pg8000 specific SSL setup for serverless Postgres providers (like Neon)
if "+pg8000" in DATABASE_URL:
    import ssl
    # Strip any "?sslmode=" query params so SQLAlchemy doesn't pass 'sslmode' as an invalid arg to pg8000
    if "?sslmode=" in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.split("?sslmode=")[0]
    elif "&sslmode=" in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.split("&sslmode=")[0]
        
    # Configure default SSL context for secure connection
    connect_args = {"ssl_context": ssl.create_default_context()}

elif DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, echo=True, connect_args=connect_args)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
