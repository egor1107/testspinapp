from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import hashlib
import hmac
import json
import urllib.parse
from datetime import datetime
import random

from database import get_db, User, InventoryItem, SpinHistory

app = FastAPI(title="Roulette API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files
app.mount("/roulette", StaticFiles(directory="../roulette", html=True), name="roulette")
app.mount("/admin", StaticFiles(directory="../admin", html=True), name="admin")

# Bot token for validation
BOT_TOKEN = "8269709411:AAFxidXj8DUdCehNZfhmfd7zRPaD5yjLBMM"

# NFT GIFs list
NFT_GIFS = [
    'gifts/B-Day Candle.gif',
    'gifts/Evil Eye.gif', 
    'gifts/Handing Star.gif',
    'gifts/Jelly Bunny.gif',
    'gifts/Jester Hat.gif',
    'gifts/Jolly Chimp.gif',
    'gifts/Lol Pop.gif',
    'gifts/Pet Snake.gif',
    'gifts/Santa Hat.gif',
    'gifts/Snoop Cigar.gif',
    'gifts/Star Notepad.gif',
    'gifts/Toy Bear.gif'
]

# Wheel configuration
WHEEL_CONFIG = [
    {"label": "2x", "count": 30, "color": "#06b6d4"},
    {"label": "3x", "count": 12, "color": "#f59e0b"}, 
    {"label": "NFT", "count": 5, "color": "#8b5cf6"},
    {"label": "Secret NFT", "count": 1, "color": "#ef4444"}
]

# Reward configuration
reward_config = {
    'Secret NFT': {'emoji': '💎', 'rarity': 'legendary'},
    'NFT': {'emoji': '🎨', 'rarity': 'epic'},
    '2x': {'emoji': '2x', 'rarity': 'common', 'reward': 250},
    '3x': {'emoji': '3x', 'rarity': 'rare', 'reward': 375}
}

# Pydantic models
class UserCreate(BaseModel):
    user_id: str
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None

class UserResponse(BaseModel):
    user_id: str
    username: Optional[str]
    first_name: Optional[str]
    last_name: Optional[str]
    balance: int
    total_spins: int
    total_wins: int
    win_streak: int
    current_streak: int
    created_at: datetime
    last_active: datetime

class SpinRequest(BaseModel):
    user_id: str
    bet_choice: str

class SpinResponse(BaseModel):
    result: str
    is_win: bool
    reward_added: bool
    new_balance: int
    inventory_item: Optional[dict] = None

class InventoryResponse(BaseModel):
    id: int
    item_type: str
    amount: int
    gif_url: Optional[str]
    rarity: str
    timestamp: datetime
    is_claimed: bool

class AdminUserUpdate(BaseModel):
    balance: Optional[int] = None
    total_spins: Optional[int] = None
    total_wins: Optional[int] = None

# Helper functions
def verify_telegram_auth(auth_data: str) -> bool:
    """Verify Telegram Web App authentication"""
    try:
        # Parse the auth data
        parsed_data = urllib.parse.parse_qs(auth_data)
        
        # Extract hash
        hash_value = parsed_data.get('hash', [''])[0]
        if not hash_value:
            return False
            
        # Remove hash from data
        data_check_arr = []
        for key, value in parsed_data.items():
            if key != 'hash':
                data_check_arr.append(f"{key}={''.join(value)}")
        
        data_check_arr.sort()
        data_check_string = '\n'.join(data_check_arr)
        
        # Create secret key
        secret_key = hashlib.sha256(BOT_TOKEN.encode()).digest()
        
        # Calculate expected hash
        expected_hash = hmac.new(
            secret_key,
            data_check_string.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return hash_value == expected_hash
    except Exception:
        return False

def get_random_nft_gif() -> str:
    """Get random NFT GIF URL"""
    return random.choice(NFT_GIFS)

def create_sectors():
    """Create wheel sectors from config"""
    sectors = []
    for item in WHEEL_CONFIG:
        for _ in range(item["count"]):
            sectors.append({
                "label": item["label"],
                "color": item["color"]
            })
    
    # Shuffle sectors
    random.shuffle(sectors)
    return sectors

# API Routes

@app.get("/")
async def root():
    return {"message": "Roulette API is running"}

@app.get("/api/user/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, db: Session = Depends(get_db)):
    """Get or create user"""
    user = db.query(User).filter(User.user_id == user_id).first()
    
    if not user:
        # Create new user with default values
        user = User(
            user_id=user_id,
            balance=1000,  # Default starting balance
            total_spins=0,
            total_wins=0,
            win_streak=0,
            current_streak=0
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update last active time
        user.last_active = datetime.utcnow()
        db.commit()
    
    return user

@app.post("/api/user/{user_id}/spin", response_model=SpinResponse)
async def spin_wheel(user_id: str, spin_request: SpinRequest, db: Session = Depends(get_db)):
    """Process wheel spin"""
    # Get user
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user has enough balance (spin costs 125 stars)
    spin_cost = 125
    if user.balance < spin_cost:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    # Deduct spin cost
    user.balance -= spin_cost
    
    # Generate spin result
    sectors = create_sectors()
    result = random.choice(sectors)["label"]
    
    # Check if win
    is_win = result == spin_request.bet_choice
    
    # Update user stats
    user.total_spins += 1
    user.last_active = datetime.utcnow()
    
    inventory_item = None
    reward_added = False
    
    if is_win:
        user.total_wins += 1
        user.current_streak += 1
        if user.current_streak > user.win_streak:
            user.win_streak = user.current_streak
        
        # Add reward to inventory
        reward_config_item = reward_config.get(result, {})
        
        if result in ['NFT', 'Secret NFT']:
            # Add NFT to inventory with random GIF
            gif_url = get_random_nft_gif()
            inventory_item = InventoryItem(
                user_id=user_id,
                item_type=result,
                amount=0,
                gif_url=gif_url,
                rarity=reward_config_item.get('rarity', 'common'),
                is_claimed=False  # NFTs don't need claiming
            )
        elif result in ['2x', '3x']:
            # Add star reward to inventory
            reward_amount = reward_config_item.get('reward', 0)
            inventory_item = InventoryItem(
                user_id=user_id,
                item_type=result,
                amount=reward_amount,
                gif_url=None,
                rarity=reward_config_item.get('rarity', 'common'),
                is_claimed=False  # Needs to be claimed
            )
        
        if inventory_item:
            db.add(inventory_item)
            reward_added = True
    else:
        user.current_streak = 0
    
    # Save spin history
    spin_history = SpinHistory(
        user_id=user_id,
        result=result,
        is_win=is_win,
        bet_choice=spin_request.bet_choice
    )
    db.add(spin_history)
    
    # Commit all changes
    db.commit()
    
    # Prepare response
    inventory_item_dict = None
    if inventory_item:
        inventory_item_dict = {
            "id": inventory_item.id,
            "item_type": inventory_item.item_type,
            "amount": inventory_item.amount,
            "gif_url": inventory_item.gif_url,
            "rarity": inventory_item.rarity,
            "is_claimed": inventory_item.is_claimed
        }
    
    return SpinResponse(
        result=result,
        is_win=is_win,
        reward_added=reward_added,
        new_balance=user.balance,
        inventory_item=inventory_item_dict
    )

@app.get("/api/user/{user_id}/inventory", response_model=List[InventoryResponse])
async def get_inventory(user_id: str, db: Session = Depends(get_db)):
    """Get user inventory"""
    items = db.query(InventoryItem).filter(InventoryItem.user_id == user_id).order_by(InventoryItem.timestamp.desc()).all()
    return items

@app.post("/api/user/{user_id}/claim/{item_id}")
async def claim_reward(user_id: str, item_id: int, db: Session = Depends(get_db)):
    """Claim star reward from inventory"""
    # Get user and item
    user = db.query(User).filter(User.user_id == user_id).first()
    item = db.query(InventoryItem).filter(
        InventoryItem.id == item_id,
        InventoryItem.user_id == user_id,
        InventoryItem.is_claimed == False
    ).first()
    
    if not user or not item:
        raise HTTPException(status_code=404, detail="User or item not found")
    
    if item.item_type not in ['2x', '3x']:
        raise HTTPException(status_code=400, detail="This item cannot be claimed")
    
    # Add amount to user balance
    user.balance += item.amount
    
    # Mark as claimed
    item.is_claimed = True
    
    db.commit()
    
    return {"success": True, "new_balance": user.balance, "claimed_amount": item.amount}

# Admin routes
@app.get("/api/admin/users")
async def get_all_users(db: Session = Depends(get_db)):
    """Get all users for admin panel"""
    users = db.query(User).order_by(User.last_active.desc()).all()
    return users

@app.put("/api/admin/user/{user_id}")
async def update_user_admin(user_id: str, update_data: AdminUserUpdate, db: Session = Depends(get_db)):
    """Update user data (admin only)"""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if update_data.balance is not None:
        user.balance = update_data.balance
    if update_data.total_spins is not None:
        user.total_spins = update_data.total_spins
    if update_data.total_wins is not None:
        user.total_wins = update_data.total_wins
    
    db.commit()
    return user

@app.delete("/api/admin/user/{user_id}/inventory/{item_id}")
async def delete_inventory_item_admin(user_id: str, item_id: int, db: Session = Depends(get_db)):
    """Delete inventory item (admin only)"""
    item = db.query(InventoryItem).filter(
        InventoryItem.id == item_id,
        InventoryItem.user_id == user_id
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    db.delete(item)
    db.commit()
    
    return {"success": True}

@app.get("/api/admin/stats")
async def get_admin_stats(db: Session = Depends(get_db)):
    """Get overall stats for admin panel"""
    total_users = db.query(User).count()
    total_spins = db.query(SpinHistory).count()
    total_wins = db.query(SpinHistory).filter(SpinHistory.is_win == True).count()
    
    return {
        "total_users": total_users,
        "total_spins": total_spins,
        "total_wins": total_wins,
        "win_rate": (total_wins / total_spins * 100) if total_spins > 0 else 0
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)