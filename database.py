from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import json

DATABASE_URL = "sqlite:///./roulette.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    user_id = Column(String, primary_key=True, index=True)  # Telegram user ID
    username = Column(String, index=True, nullable=True)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    balance = Column(Integer, default=1000)  # Звезды
    total_spins = Column(Integer, default=0)
    total_wins = Column(Integer, default=0)
    win_streak = Column(Integer, default=0)
    current_streak = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_active = Column(DateTime, default=datetime.utcnow)

class InventoryItem(Base):
    __tablename__ = "inventory"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String, index=True)  # Foreign key to User
    item_type = Column(String)  # '2x', '3x', 'NFT', 'Secret NFT'
    amount = Column(Integer, default=0)  # Amount for star rewards
    gif_url = Column(String, nullable=True)  # GIF URL for NFT items
    rarity = Column(String)  # common, rare, epic, legendary
    timestamp = Column(DateTime, default=datetime.utcnow)
    is_claimed = Column(Boolean, default=False)  # For star rewards

class SpinHistory(Base):
    __tablename__ = "spin_history"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String, index=True)
    result = Column(String)  # Result of the spin
    is_win = Column(Boolean)  # Whether user won their bet
    bet_choice = Column(String)  # What user bet on
    timestamp = Column(DateTime, default=datetime.utcnow)

# Create tables
Base.metadata.create_all(bind=engine)

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()