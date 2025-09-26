from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
import sqlite3
import json
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
import uuid
from datetime import datetime, timezone
import hashlib
import hmac
import urllib.parse

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# SQLite database setup
DB_PATH = ROOT_DIR / 'roulette.db'

def init_database():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create users table with all necessary fields
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_user_id TEXT UNIQUE NOT NULL,
            username TEXT,
            first_name TEXT,
            last_name TEXT,
            spins INTEGER DEFAULT 0,
            wins INTEGER DEFAULT 0,
            win_streak INTEGER DEFAULT 0,
            current_streak INTEGER DEFAULT 0,
            balance INTEGER DEFAULT 1000,
            inventory TEXT DEFAULT '{}',
            last_daily TEXT DEFAULT '0',
            sound_enabled INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create spin history table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS spin_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_user_id TEXT NOT NULL,
            prize TEXT NOT NULL,
            is_win INTEGER NOT NULL,
            bet_choice TEXT NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (telegram_user_id) REFERENCES users (telegram_user_id)
        )
    ''')
    
    conn.commit()
    conn.close()

# Initialize database on startup
init_database()

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer(auto_error=False)

# Bot token for validation
BOT_TOKEN = "8269709411:AAFxidXj8DUdCehNZfhmfd7zRPaD5yjLBMM"

# Pydantic models
class TelegramUser(BaseModel):
    id: int
    first_name: str
    last_name: Optional[str] = None
    username: Optional[str] = None
    language_code: Optional[str] = None
    is_premium: Optional[bool] = None

class UserProfile(BaseModel):
    telegram_user_id: str
    username: Optional[str]
    first_name: str
    last_name: Optional[str]
    spins: int
    wins: int
    win_streak: int
    current_streak: int
    balance: int
    inventory: Dict
    last_daily: str
    sound_enabled: bool

class UserStats(BaseModel):
    spins: int
    wins: int
    win_streak: int
    current_streak: int
    balance: int
    inventory: Dict
    sound_enabled: bool

class SpinResult(BaseModel):
    prize: str
    is_win: bool
    bet_choice: str

class UpdateStats(BaseModel):
    spins: int
    wins: int
    win_streak: int
    current_streak: int
    inventory: Dict

# Telegram Web App data validation
def validate_telegram_data(init_data: str) -> Dict:
    """Validate Telegram Web App init data"""
    try:
        # Parse the init_data
        parsed_data = urllib.parse.parse_qs(init_data)
        
        # Extract hash and other data
        received_hash = parsed_data.get('hash', [''])[0]
        if not received_hash:
            raise HTTPException(status_code=401, detail="No hash provided")
        
        # Remove hash from data for validation
        data_check_string_parts = []
        for key, value in parsed_data.items():
            if key != 'hash':
                data_check_string_parts.append(f"{key}={value[0]}")
        
        data_check_string_parts.sort()
        data_check_string = '\n'.join(data_check_string_parts)
        
        # Create secret key
        secret_key = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
        
        # Calculate hash
        calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
        
        # Verify hash
        if not hmac.compare_digest(received_hash, calculated_hash):
            raise HTTPException(status_code=401, detail="Invalid hash")
        
        # Parse user data
        user_data = json.loads(parsed_data.get('user', ['{}'])[0])
        return user_data
        
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid Telegram data: {str(e)}")

# Dependency to get current user
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Authorization required")
    
    # The token should be the Telegram Web App init_data
    user_data = validate_telegram_data(credentials.credentials)
    return user_data

# Database helper functions
def get_user_profile(telegram_user_id: str) -> Optional[Dict]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute(
        "SELECT * FROM users WHERE telegram_user_id = ?",
        (telegram_user_id,)
    )
    
    user = cursor.fetchone()
    conn.close()
    
    if user:
        user_dict = dict(user)
        user_dict['inventory'] = json.loads(user_dict['inventory'])
        user_dict['sound_enabled'] = bool(user_dict['sound_enabled'])
        return user_dict
    return None

def create_or_update_user(user_data: Dict) -> Dict:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    telegram_user_id = str(user_data['id'])
    username = user_data.get('username', '')
    first_name = user_data.get('first_name', '')
    last_name = user_data.get('last_name', '')
    
    # Check if user exists
    existing_user = get_user_profile(telegram_user_id)
    
    if existing_user:
        # Update existing user
        cursor.execute(
            '''
            UPDATE users 
            SET username = ?, first_name = ?, last_name = ?, updated_at = CURRENT_TIMESTAMP
            WHERE telegram_user_id = ?
            ''',
            (username, first_name, last_name, telegram_user_id)
        )
    else:
        # Create new user
        cursor.execute(
            '''
            INSERT INTO users (telegram_user_id, username, first_name, last_name)
            VALUES (?, ?, ?, ?)
            ''',
            (telegram_user_id, username, first_name, last_name)
        )
    
    conn.commit()
    conn.close()
    
    return get_user_profile(telegram_user_id)

def update_user_stats(telegram_user_id: str, stats: Dict):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute(
        '''
        UPDATE users 
        SET spins = ?, wins = ?, win_streak = ?, current_streak = ?, 
            inventory = ?, updated_at = CURRENT_TIMESTAMP
        WHERE telegram_user_id = ?
        ''',
        (
            stats['spins'],
            stats['wins'], 
            stats['win_streak'],
            stats['current_streak'],
            json.dumps(stats['inventory']),
            telegram_user_id
        )
    )
    
    conn.commit()
    conn.close()

def save_spin_result(telegram_user_id: str, spin_data: Dict):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute(
        '''
        INSERT INTO spin_history (telegram_user_id, prize, is_win, bet_choice)
        VALUES (?, ?, ?, ?)
        ''',
        (
            telegram_user_id,
            spin_data['prize'],
            1 if spin_data['is_win'] else 0,
            spin_data['bet_choice']
        )
    )
    
    conn.commit()
    conn.close()

# API Routes
@api_router.get("/")
async def root():
    return {"message": "Telegram Roulette API"}

@api_router.get("/user/profile", response_model=UserProfile)
async def get_user_profile_endpoint(current_user: Dict = Depends(get_current_user)):
    telegram_user_id = str(current_user['id'])
    
    # Create or update user profile
    user_profile = create_or_update_user(current_user)
    
    return UserProfile(
        telegram_user_id=user_profile['telegram_user_id'],
        username=user_profile['username'],
        first_name=user_profile['first_name'],
        last_name=user_profile['last_name'],
        spins=user_profile['spins'],
        wins=user_profile['wins'],
        win_streak=user_profile['win_streak'],
        current_streak=user_profile['current_streak'],
        balance=user_profile['balance'],
        inventory=user_profile['inventory'],
        last_daily=user_profile['last_daily'],
        sound_enabled=user_profile['sound_enabled']
    )

@api_router.get("/user/stats", response_model=UserStats)
async def get_user_stats(current_user: Dict = Depends(get_current_user)):
    telegram_user_id = str(current_user['id'])
    user_profile = get_user_profile(telegram_user_id)
    
    if not user_profile:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserStats(
        spins=user_profile['spins'],
        wins=user_profile['wins'],
        win_streak=user_profile['win_streak'],
        current_streak=user_profile['current_streak'],
        balance=user_profile['balance'],
        inventory=user_profile['inventory'],
        sound_enabled=user_profile['sound_enabled']
    )

@api_router.post("/user/stats")
async def update_user_stats_endpoint(
    stats: UpdateStats,
    current_user: Dict = Depends(get_current_user)
):
    telegram_user_id = str(current_user['id'])
    
    update_user_stats(telegram_user_id, stats.dict())
    return {"message": "Stats updated successfully"}

@api_router.post("/spin/result")
async def save_spin_result_endpoint(
    spin_result: SpinResult,
    current_user: Dict = Depends(get_current_user)
):
    telegram_user_id = str(current_user['id'])
    
    save_spin_result(telegram_user_id, spin_result.dict())
    return {"message": "Spin result saved"}

@api_router.post("/user/sound")
async def toggle_sound(
    sound_enabled: bool,
    current_user: Dict = Depends(get_current_user)
):
    telegram_user_id = str(current_user['id'])
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute(
        "UPDATE users SET sound_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE telegram_user_id = ?",
        (1 if sound_enabled else 0, telegram_user_id)
    )
    
    conn.commit()
    conn.close()
    
    return {"message": "Sound setting updated"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    logger.info("Telegram Roulette API started")
    init_database()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)