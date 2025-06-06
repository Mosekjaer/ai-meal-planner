from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, security, schemas
from ..database import get_db
from ..openrouter_client import OpenRouterClient

router = APIRouter(prefix="/recipes", tags=["recipes"])
openrouter_client = OpenRouterClient()

@router.post("/generate")
async def generate_recipe(
    preferences: dict,
    current_user: dict = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    try:
        recipe_data = openrouter_client.generate_recipe(preferences)
        
        # Create nutrition record
        nutrition = models.Nutrition(
            calories=recipe_data["nutrition"]["calories"],
            protein=recipe_data["nutrition"]["protein"],
            carbs=recipe_data["nutrition"]["carbs"],
            fat=recipe_data["nutrition"]["fat"]
        )
        db.add(nutrition)
        db.flush()
        
        # Create recipe record
        recipe = models.Recipe(
            servings=recipe_data["servings"],
            prep_time=recipe_data["prep_time"],
            cook_time=recipe_data["cook_time"],
            difficulty=recipe_data["difficulty"],
            instructions="\n".join(recipe_data["instructions"]),
            tips="\n".join(recipe_data["tips"]) if recipe_data.get("tips") else None,
            nutrition_id=nutrition.id
        )
        db.add(recipe)
        db.flush()
        
        # Create ingredients and recipe_ingredients records
        for ing in recipe_data["ingredients"]:
            ingredient = db.query(models.Ingredient).filter(
                models.Ingredient.name == ing["name"]
            ).first()
            
            if not ingredient:
                ingredient = models.Ingredient(
                    name=ing["name"],
                    default_unit=ing["unit"]
                )
                db.add(ingredient)
                db.flush()
            
            recipe_ingredient = models.RecipeIngredient(
                recipe_id=recipe.id,
                ingredient_id=ingredient.id,
                amount=ing["amount"],
                unit=ing["unit"],
                notes=ing.get("notes")
            )
            db.add(recipe_ingredient)
        
        db.commit()
        return recipe_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{recipe_id}", response_model=schemas.RecipeResponse)
async def get_recipe(
    recipe_id: int,
    current_user: dict = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    recipe = db.query(models.Recipe).filter(models.Recipe.id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return recipe 