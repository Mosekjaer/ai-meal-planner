from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import json

from .. import models, security, schemas
from ..database import get_db

router = APIRouter(prefix="/preferences", tags=["preferences"])

@router.get("", response_model=schemas.UserPreferencesUpdate)
async def get_preferences(
    current_user: dict = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    preferences = db.query(models.UserPreference).filter(
        models.UserPreference.user_id == current_user["user_id"]
    ).first()
    
    if not preferences:
        # Return default preferences
        return {
            "dietary_restrictions": [],
            "calories_per_day": 2000,
            "meal_complexity": "medium",
            "cuisine_preferences": []
        }
    
    stored_preferences = json.loads(preferences.preferences)
    # Ensure all fields are present with defaults if missing
    return {
        "dietary_restrictions": stored_preferences.get("dietary_restrictions", []),
        "calories_per_day": stored_preferences.get("calories_per_day", 2000),
        "meal_complexity": stored_preferences.get("meal_complexity", "medium"),
        "cuisine_preferences": stored_preferences.get("cuisine_preferences", [])
    }

@router.put("")
async def update_preferences(
    preferences: schemas.UserPreferencesUpdate,
    current_user: dict = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user["user_id"]
    db_preferences = db.query(models.UserPreference).filter(
        models.UserPreference.user_id == user_id
    ).first()
    
    if not db_preferences:
        db_preferences = models.UserPreference(
            user_id=user_id,
            preferences=json.dumps(preferences.dict())
        )
        db.add(db_preferences)
    else:
        db_preferences.preferences = json.dumps(preferences.dict())
    
    db.commit()
    return {"message": "Preferences updated successfully"} 