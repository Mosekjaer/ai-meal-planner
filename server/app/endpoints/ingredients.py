from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .. import models, security, schemas
from ..database import get_db

router = APIRouter(prefix="/ingredients", tags=["ingredients"])

@router.get("/common", response_model=List[schemas.IngredientResponse])
async def get_common_ingredients(db: Session = Depends(get_db)):
    return [
        {"id": i, "name": name, "emoji": emoji, "quantity": 0, "unit": unit, "default_unit": unit}
        for i, (name, emoji, unit) in enumerate([
            ("Chicken", "🐔", "lbs"),
            ("Rice", "🍚", "cups"),
            ("Pasta", "🍝", "boxes"),
            ("Eggs", "🥚", "dozen"),
            ("Potatoes", "🥔", "lbs"),
            ("Onions", "🧅", "pieces"),
            ("Tomatoes", "🍅", "pieces"),
            ("Cheese", "🧀", "blocks"),
            ("Bread", "🍞", "loaves"),
            ("Milk", "🥛", "gallons"),
            ("Garlic", "🧄", "bulbs"),
            ("Carrots", "🥕", "lbs"),
        ], 1)
    ]

@router.get("/user", response_model=List[schemas.IngredientResponse])
async def get_user_ingredients(
    current_user: dict = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(models.UserIngredient).filter(
        models.UserIngredient.user_id == current_user["user_id"]
    ).all()

@router.post("/user", response_model=schemas.IngredientResponse)
async def add_user_ingredient(
    ingredient: schemas.IngredientCreate,
    current_user: dict = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    db_ingredient = models.Ingredient(
        name=ingredient.name,
        emoji=ingredient.emoji,
        default_unit=ingredient.default_unit or ingredient.unit
    )
    db.add(db_ingredient)
    db.flush()

    user_ingredient = models.UserIngredient(
        user_id=current_user["user_id"],
        ingredient_id=db_ingredient.id,
        quantity=ingredient.quantity,
        unit=ingredient.unit
    )
    db.add(user_ingredient)
    db.commit()
    db.refresh(user_ingredient)
    return user_ingredient

@router.put("/user/{ingredient_id}")
async def update_user_ingredient(
    ingredient_id: int,
    ingredient: schemas.IngredientBase,
    current_user: dict = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    db_ingredient = db.query(models.UserIngredient).filter(
        models.UserIngredient.id == ingredient_id,
        models.UserIngredient.user_id == current_user["user_id"]
    ).first()
    
    if not db_ingredient:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    
    db_ingredient.quantity = ingredient.quantity
    db_ingredient.unit = ingredient.unit
    db.commit()
    return {"message": "Ingredient updated successfully"}

@router.delete("/user/{ingredient_id}")
async def delete_user_ingredient(
    ingredient_id: int,
    current_user: dict = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    db_ingredient = db.query(models.UserIngredient).filter(
        models.UserIngredient.id == ingredient_id,
        models.UserIngredient.user_id == current_user["user_id"]
    ).first()
    
    if not db_ingredient:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    
    db.delete(db_ingredient)
    db.commit()
    return {"message": "Ingredient deleted successfully"} 