from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional

from .. import models, security, schemas
from ..database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/token", response_model=schemas.Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    
    # Create refresh token
    refresh_token = security.create_refresh_token()
    refresh_token_expires = datetime.utcnow() + timedelta(days=security.REFRESH_TOKEN_EXPIRE_DAYS)
    
    # Store refresh token in database
    db_refresh_token = models.RefreshToken(
        token=refresh_token,
        expires_at=refresh_token_expires,
        user_id=user.id
    )
    db.add(db_refresh_token)
    db.commit()
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/refresh", response_model=schemas.Token)
async def refresh_access_token(
    token_data: schemas.TokenRefresh,
    db: Session = Depends(get_db)
):
    # Find the refresh token in the database
    db_refresh_token = db.query(models.RefreshToken).filter(
        models.RefreshToken.token == token_data.refresh_token
    ).first()
    
    # Verify the refresh token
    if not security.verify_refresh_token(token_data.refresh_token, db_refresh_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
    
    try:
        # Create new access token
        access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = security.create_access_token(
            data={"sub": str(db_refresh_token.user_id)},
            expires_delta=access_token_expires
        )
        
        # Create new refresh token
        new_refresh_token = security.create_refresh_token()
        refresh_token_expires = datetime.utcnow() + timedelta(days=security.REFRESH_TOKEN_EXPIRE_DAYS)
        
        # Check if token was already revoked (handle race condition)
        db.refresh(db_refresh_token)
        if db_refresh_token.is_revoked:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has been revoked"
            )
        
        # Revoke old refresh token and create new one
        db_refresh_token.is_revoked = True
        new_db_refresh_token = models.RefreshToken(
            token=new_refresh_token,
            expires_at=refresh_token_expires,
            user_id=db_refresh_token.user_id
        )
        db.add(new_db_refresh_token)
        db.commit()
        
        return {
            "access_token": access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to refresh token"
        ) from e

@router.post("/register", response_model=schemas.UserResponse)
async def create_user(
    user: schemas.UserCreate,
    current_user: Optional[dict] = Depends(security.get_current_user_optional),
    db: Session = Depends(get_db)
):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Only allow admin users to create other admin users
    if user.role == "admin" and (not current_user or current_user.get("role") != "admin"):
        raise HTTPException(
            status_code=403,
            detail="Only admin users can create other admin users"
        )
    
    # Ensure role is valid
    valid_roles = ["user", "subscriber", "admin"]
    if user.role not in valid_roles:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}"
        )
    
    hashed_password = security.get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        hashed_password=hashed_password,
        name=user.name,
        role=user.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.post("/logout")
async def logout(
    token_data: schemas.TokenRefresh,
    db: Session = Depends(get_db)
):
    # Revoke the refresh token
    db_refresh_token = db.query(models.RefreshToken).filter(
        models.RefreshToken.token == token_data.refresh_token
    ).first()
    
    if db_refresh_token:
        db_refresh_token.is_revoked = True
        db.commit()
    
    return {"message": "Successfully logged out"} 