from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import date
from isoweek import Week
import logging

from .. import models, security
from ..database import get_db

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/shopping-list", tags=["shopping-list"])

class ShoppingItemUpdate(BaseModel):
    bought: bool

def get_week_info(week_number: Optional[int] = None, year: Optional[int] = None):
    """Get week number and year. If not provided, use current week."""
    if week_number is None or year is None:
        today = date.today()
        week = Week.withdate(today)
        return week.week, week.year
    return week_number, year

@router.get("/current")
async def get_current_shopping_list(
    current_user: dict = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    """Get shopping list for current week."""
    week_number, year = get_week_info()
    return await get_week_shopping_list(week_number, year, current_user, db)

@router.get("/week/{year}/{week_number}")
async def get_week_shopping_list(
    week_number: int,
    year: int,
    current_user: dict = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    """Get shopping list for a specific week."""
    logger.info(f"Getting shopping list for week {week_number}, year {year}, user {current_user['user_id']}")
    
    meal_plan = db.query(models.MealPlan).filter(
        models.MealPlan.user_id == current_user["user_id"],
        models.MealPlan.week_number == week_number,
        models.MealPlan.year == year
    ).first()
    
    if not meal_plan:
        logger.info(f"No meal plan found for week {week_number}, year {year}")
        return []
    
    logger.info(f"Found meal plan with ID {meal_plan.id}")
    
    shopping_items = db.query(models.ShoppingItem).filter(
        models.ShoppingItem.meal_plan_id == meal_plan.id
    ).all()

    logger.info(f"Found {len(shopping_items)} shopping items")

    # Convert to dictionary for JSON response and include ingredient name
    response_items = []
    for item in shopping_items:
        if item.ingredient:  # Only include items that have valid ingredients
            response_items.append({
                "id": item.id,
                "name": item.ingredient.name,
                "quantity": 0,  # Available quantity from user's pantry
                "needed": item.quantity_needed,
                "unit": item.unit,
                "category": item.category,
                "bought": item.bought
            })
            logger.debug(f"Added shopping item: {response_items[-1]}")
        else:
            logger.warning(f"Shopping item {item.id} has no ingredient")
    
    logger.info(f"Returning {len(response_items)} valid shopping items")
    return response_items

@router.patch("/items/{item_id}")
async def update_shopping_item(
    item_id: int,
    update: ShoppingItemUpdate,
    current_user: dict = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    """Update a shopping item's bought status."""
    # Get the shopping item
    shopping_item = db.query(models.ShoppingItem).join(
        models.MealPlan
    ).filter(
        models.ShoppingItem.id == item_id,
        models.MealPlan.user_id == current_user["user_id"]
    ).first()
    
    if not shopping_item:
        raise HTTPException(status_code=404, detail="Shopping item not found")
    
    # Update the bought status
    shopping_item.bought = update.bought
    db.commit()
    
    return {
        "id": shopping_item.id,
        "name": shopping_item.ingredient.name if shopping_item.ingredient else None,
        "quantity": 0,  # Available quantity from user's pantry
        "needed": shopping_item.quantity_needed,
        "unit": shopping_item.unit,
        "category": shopping_item.category,
        "bought": shopping_item.bought
    } 