from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from .. import models, security, schemas
from ..database import get_db

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/profile", response_model=schemas.UserProfileResponse)
async def get_profile(
    current_user: dict = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.id == current_user["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/profile", response_model=schemas.UserProfileResponse)
async def update_profile(
    profile_update: schemas.UserProfileUpdate,
    current_user: dict = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.id == current_user["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update user fields if provided
    if profile_update.name is not None:
        user.name = profile_update.name
    if profile_update.language is not None:
        user.language = profile_update.language
    if profile_update.email is not None:
        # Check if email is already taken by another user
        existing_user = db.query(models.User).filter(
            models.User.email == profile_update.email,
            models.User.id != user.id
        ).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        user.email = profile_update.email
    
    db.commit()
    db.refresh(user)
    return user 