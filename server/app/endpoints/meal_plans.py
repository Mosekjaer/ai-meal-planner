from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
import logging
import json
from typing import List, Literal, Optional
from datetime import datetime, date
from isoweek import Week

from .. import models, security, schemas
from ..database import get_db
from ..openrouter_client import OpenRouterClient

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/meal-plans", tags=["meal-plans"])
openrouter_client = OpenRouterClient()

def transform_meal_data(meal_name: str) -> dict:
    """Transform a meal name into the full meal object structure expected by the frontend."""
    
    def get_meal_specific_ingredients(meal_name: str) -> list:
        meal_name_lower = meal_name.lower()
        
        # Breakfast ingredients
        if "breakfast" in meal_name_lower or any(x in meal_name_lower for x in ["pancake", "waffle", "eggs", "oatmeal", "cereal"]):
            return [
                {"name": "Eggs", "amount": 2, "unit": "pieces", "notes": "Large eggs"},
                {"name": "Milk", "amount": 1, "unit": "cup", "notes": "Whole or 2%"},
                {"name": "Butter", "amount": 2, "unit": "tbsp", "notes": "For cooking"},
                {"name": "Bread", "amount": 2, "unit": "slices", "notes": "Toasted"},
                {"name": "Fruits", "amount": 1, "unit": "cup", "notes": "Fresh, seasonal"}
            ]
        
        # Lunch ingredients
        elif "lunch" in meal_name_lower or any(x in meal_name_lower for x in ["sandwich", "salad", "soup"]):
            return [
                {"name": "Chicken breast", "amount": 6, "unit": "oz", "notes": "Sliced"},
                {"name": "Mixed greens", "amount": 2, "unit": "cups", "notes": "Fresh"},
                {"name": "Tomatoes", "amount": 1, "unit": "pieces", "notes": "Diced"},
                {"name": "Cucumber", "amount": 0.5, "unit": "pieces", "notes": "Sliced"},
                {"name": "Cheese", "amount": 2, "unit": "oz", "notes": "Shredded"}
            ]
        
        # Dinner ingredients
        else:
            return [
                {"name": "Chicken thighs", "amount": 8, "unit": "oz", "notes": "Boneless"},
                {"name": "Rice", "amount": 1, "unit": "cup", "notes": "Uncooked"},
                {"name": "Broccoli", "amount": 2, "unit": "cups", "notes": "Florets"},
                {"name": "Carrots", "amount": 2, "unit": "pieces", "notes": "Chopped"},
                {"name": "Onion", "amount": 1, "unit": "pieces", "notes": "Diced"}
            ]
    
    # Base ingredients that most recipes need
    base_ingredients = [
        {"name": "Olive oil", "amount": 2, "unit": "tbsp", "notes": "For cooking"},
        {"name": "Salt", "amount": 1, "unit": "tsp", "notes": "To taste"},
        {"name": "Black pepper", "amount": 0.5, "unit": "tsp", "notes": "Freshly ground"}
    ]
    
    # Get meal-specific ingredients
    specific_ingredients = get_meal_specific_ingredients(meal_name)
    
    # Combine all ingredients
    ingredient_details = base_ingredients + specific_ingredients
    
    return {
        "name": meal_name,
        "description": f"A delicious {meal_name.lower()} prepared just for you",
        "emoji": "🍽️",  # Default emoji
        "recipe": {
            "servings": 4,
            "prepTime": 15,  # Using camelCase for frontend consistency
            "cookTime": 20,  # Using camelCase for frontend consistency
            "difficulty": "Medium",
            "instructions": [
                "Gather all ingredients and equipment",
                "Prepare ingredients according to recipe",
                "Cook following the instructions",
                "Plate and serve while hot"
            ],
            "ingredientDetails": ingredient_details,
            "tips": [
                "Prep ingredients in advance",
                "Adjust seasoning to taste",
                "Store leftovers properly"
            ],
            "nutrition": {
                "calories": 400,
                "protein": 20,
                "carbs": 30,
                "fat": 15
            }
        }
    }

def create_shopping_items(db: Session, meal_plan_id: int, recipe_data: dict):
    """Create shopping items for a recipe in the meal plan."""
    logger.info(f"Creating shopping items for meal plan {meal_plan_id}")
    
    # Create a dictionary to aggregate quantities
    # Key is (ingredient_name, unit) to prevent mixing different units
    aggregated_items = {}
    
    # Process new ingredients from recipe
    ingredients = recipe_data.get("recipe", {}).get("ingredientDetails", [])
    for ingredient in ingredients:
        key = (ingredient["name"].lower(), ingredient["unit"])
        
        # Get or create the ingredient
        db_ingredient = db.query(models.Ingredient).filter(
            models.Ingredient.name == ingredient["name"]
        ).first()
        
        if not db_ingredient:
            db_ingredient = models.Ingredient(
                name=ingredient["name"],
                default_unit=ingredient["unit"]
            )
            db.add(db_ingredient)
            db.flush()
            logger.info(f"Created new ingredient: {db_ingredient.name}")
        
        if key in aggregated_items:
            # Update quantity for existing ingredient
            aggregated_items[key]["quantity"] += ingredient["amount"]
            logger.info(f"Updated quantity for {db_ingredient.name}: +{ingredient['amount']} {ingredient['unit']}")
        else:
            # Add new ingredient to aggregation dictionary
            aggregated_items[key] = {
                "ingredient_id": db_ingredient.id,
                "quantity": ingredient["amount"],
                "unit": ingredient["unit"],
                "category": get_ingredient_category(ingredient["name"]),
                "bought": False
            }
            logger.info(f"Added new ingredient to aggregate: {db_ingredient.name} - {ingredient['amount']} {ingredient['unit']}")
    
    # Create new shopping items from aggregated data
    for (name, unit), item_data in aggregated_items.items():
        shopping_item = models.ShoppingItem(
            meal_plan_id=meal_plan_id,
            ingredient_id=item_data["ingredient_id"],
            quantity_needed=item_data["quantity"],
            unit=item_data["unit"],
            category=item_data["category"],
            bought=item_data["bought"]
        )
        db.add(shopping_item)
        logger.info(f"Created shopping item: {name} - {item_data['quantity']} {unit}")
    
    db.flush()
    logger.info("Finished creating shopping items")

def get_ingredient_category(name: str) -> str:
    """Determine the category of an ingredient."""
    name_lower = name.lower()
    
    if any(protein in name_lower for protein in ["chicken", "beef", "fish", "pork", "tofu", "eggs"]):
        return "Proteins"
    if any(veggie in name_lower for veggie in ["carrot", "onion", "garlic", "pepper", "tomato", "lettuce"]):
        return "Vegetables"
    if any(fruit in name_lower for fruit in ["apple", "banana", "orange", "berry"]):
        return "Fruits"
    if any(dairy in name_lower for dairy in ["milk", "cheese", "yogurt", "cream"]):
        return "Dairy"
    if any(grain in name_lower for grain in ["rice", "pasta", "bread", "flour"]):
        return "Grains"
    if any(spice in name_lower for spice in ["salt", "pepper", "spice", "herb"]):
        return "Spices"
    if any(pantry in name_lower for pantry in ["oil", "vinegar", "sauce", "stock", "can"]):
        return "Pantry"
    
    return "Other"

@router.get("/current/meals/{day_index}/{meal_type}")
async def get_meal_details(
    day_index: int,
    meal_type: str,
    current_user: dict = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    # Get current meal plan
    meal_plan = db.query(models.MealPlan).filter(
        models.MealPlan.user_id == current_user["user_id"]
    ).order_by(models.MealPlan.created_at.desc()).first()
    
    if not meal_plan:
        raise HTTPException(status_code=404, detail="No active meal plan found")
    
    # Calculate day_of_week consistently
    day_of_week = day_index % 7  # Convert to 0-6 range
    logger.info(f"Getting meal details for day_of_week: {day_of_week}")
    
    # Get daily meal with recipe eagerly loaded
    daily_meal = db.query(models.DailyMeal).join(
        models.Meal, models.DailyMeal.meal_id == models.Meal.id
    ).join(
        models.Recipe, models.Meal.recipe_id == models.Recipe.id
    ).options(
        joinedload(models.DailyMeal.meal).joinedload(models.Meal.recipe).joinedload(models.Recipe.ingredients).joinedload(models.RecipeIngredient.ingredient),
        joinedload(models.DailyMeal.meal).joinedload(models.Meal.recipe).joinedload(models.Recipe.nutrition)
    ).filter(
        models.DailyMeal.meal_plan_id == meal_plan.id,
        models.DailyMeal.day_of_week == day_of_week,
        models.DailyMeal.meal_type == meal_type
    ).first()
    
    if not daily_meal or not daily_meal.meal:
        logger.error(f"Meal not found for day {day_of_week} and type {meal_type}")
        raise HTTPException(status_code=404, detail="Meal not found")
    
    # Get recipe details
    recipe = daily_meal.meal.recipe
    if not recipe:
        logger.error(f"Recipe not found for meal {daily_meal.meal_id}")
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    logger.info(f"Found recipe with servings: {recipe.servings}")
    
    # Get recipe ingredients
    ingredients = []
    for ri in recipe.ingredients:
        ingredients.append({
            "name": ri.ingredient.name,
            "amount": ri.amount,
            "unit": ri.unit,
            "notes": ri.notes
        })
    
    # Format response
    return {
        "name": daily_meal.meal.name,
        "description": daily_meal.meal.description,
        "emoji": daily_meal.meal.emoji,
        "recipe": {
            "servings": recipe.servings,
            "prepTime": recipe.prep_time,
            "cookTime": recipe.cook_time,
            "difficulty": recipe.difficulty,
            "instructions": recipe.instructions.split("\n") if recipe.instructions else [],
            "ingredientDetails": ingredients,
            "tips": recipe.tips.split("\n") if recipe.tips else [],
            "nutrition": {
                "calories": recipe.nutrition.calories,
                "protein": recipe.nutrition.protein,
                "carbs": recipe.nutrition.carbs,
                "fat": recipe.nutrition.fat
            } if recipe.nutrition else None
        }
    }

class UserPreferencesSchema(BaseModel):
    dietary_restrictions: List[str]
    calories_per_day: int
    meal_complexity: str
    cuisine_preferences: List[str]
    meal_types: List[Literal["breakfast", "lunch", "dinner"]]

def get_current_week_info() -> schemas.WeekInfo:
    """Get the current ISO week number and year."""
    today = date.today()
    week = Week.withdate(today)
    return schemas.WeekInfo(week_number=week.week, year=week.year)

@router.post("/generate", response_model=schemas.MealPlanResponse)
async def generate_meal_plan(
    meal_plan: schemas.MealPlanCreate,
    current_user: dict = Depends(security.get_subscriber_user),  # Only subscribers and admins
    db: Session = Depends(get_db)
):
    """Generate a meal plan based on user preferences."""
    try:
        # Get user's language preference
        user = db.query(models.User).filter(models.User.id == current_user["user_id"]).first()
        user_language = user.language if user else "en"
        logger.info(f"Generating meal plan for user {current_user['user_id']} with language {user_language}")

        # If no week info provided, use current week
        if not meal_plan.week_info:
            week_info = get_current_week_info()

        # Delete existing meal plan for the specified week if it exists
        existing_plan = db.query(models.MealPlan).filter(
            models.MealPlan.user_id == current_user["user_id"],
            models.MealPlan.week_number == week_info.week_number,
            models.MealPlan.year == week_info.year
        ).first()
        if existing_plan:
            db.delete(existing_plan)
            db.commit()

        # Create new meal plan
        meal_plan = models.MealPlan(
            user_id=current_user["user_id"],
            week_number=week_info.week_number,
            year=week_info.year
        )
        db.add(meal_plan)
        db.flush()

        # Generate the meal plan with the user's language
        meal_plan_data = openrouter_client.generate_meal_plan(
            meal_plan.dict(),
            language=user_language
        )

        # Collect all ingredients from all meals
        all_ingredients = []

        # Process each day in the meal plan
        for day_data in meal_plan_data["days"]:
            day_index = day_data["day"]
            for meal_type, meal_data in day_data["meals"].items():
                # Skip if no meal data
                if not meal_data:
                    continue

                # Create or get recipe
                recipe_data = meal_data.get("recipe", meal_data)  # Handle both structures
                
                # Create nutrition record
                nutrition = models.Nutrition(
                    calories=recipe_data.get("nutrition", {}).get("calories", 500),
                    protein=recipe_data.get("nutrition", {}).get("protein", 20),
                    carbs=recipe_data.get("nutrition", {}).get("carbs", 50),
                    fat=recipe_data.get("nutrition", {}).get("fat", 25)
                )
                db.add(nutrition)
                db.flush()

                # Create recipe record
                recipe = models.Recipe(
                    servings=recipe_data.get("servings", 4),
                    prep_time=recipe_data.get("prep_time", 15),
                    cook_time=recipe_data.get("cook_time", 20),
                    difficulty=recipe_data.get("difficulty", "Medium"),
                    instructions="\n".join(recipe_data.get("instructions", [])),
                    tips="\n".join(recipe_data.get("tips", [])),
                    nutrition_id=nutrition.id
                )
                db.add(recipe)
                db.flush()

                # Create meal
                meal = models.Meal(
                    name=meal_data["name"],
                    description=meal_data.get("description", ""),
                    emoji=meal_data.get("emoji", "🍽️"),
                    recipe_id=recipe.id,
                    servings=meal_data.get("servings", 4),
                    leftover_from=meal_data.get("leftover_from"),
                    makes_leftovers_for=meal_data.get("makes_leftovers_for")
                )
                db.add(meal)
                db.flush()

                # Create recipe ingredients and collect for shopping list
                ingredients = []
                for ingredient_data in recipe_data.get("ingredients", []):
                    if not isinstance(ingredient_data, dict):
                        continue
                        
                    # Get or create ingredient
                    ingredient = db.query(models.Ingredient).filter(
                        models.Ingredient.name == ingredient_data.get("name")
                    ).first()
                    
                    if not ingredient:
                        ingredient = models.Ingredient(
                            name=ingredient_data.get("name", "Unknown Ingredient"),
                            default_unit=ingredient_data.get("unit", "pieces")
                        )
                        db.add(ingredient)
                        db.flush()
                    
                    # Create recipe ingredient
                    recipe_ingredient = models.RecipeIngredient(
                        recipe_id=recipe.id,
                        ingredient_id=ingredient.id,
                        amount=ingredient_data.get("amount", 1),
                        unit=ingredient_data.get("unit", "pieces"),
                        notes=ingredient_data.get("notes")
                    )
                    db.add(recipe_ingredient)
                    
                    # Add to ingredients list for shopping list
                    ingredients.append({
                        "name": ingredient_data.get("name"),
                        "amount": ingredient_data.get("amount", 1),
                        "unit": ingredient_data.get("unit", "pieces"),
                        "notes": ingredient_data.get("notes")
                    })
                    all_ingredients.extend(ingredients)
                
                # Create daily meal
                daily_meal = models.DailyMeal(
                    meal_plan_id=meal_plan.id,
                    day_of_week=(day_index - 1) % 7,  # Convert from 1-7 to 0-6
                    meal_type=meal_type,
                    meal_id=meal.id
                )
                db.add(daily_meal)

        # Create shopping items for all collected ingredients
        create_shopping_items(db, meal_plan.id, {"recipe": {"ingredientDetails": all_ingredients}})

        db.commit()
        return meal_plan_data

    except Exception as e:
        logger.error(f"Error generating meal plan: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/current/meals")
async def update_meal_in_plan(
    update: schemas.MealUpdateRequest,
    current_user: dict = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Get current meal plan
        meal_plan = db.query(models.MealPlan).filter(
            models.MealPlan.user_id == current_user["user_id"]
        ).order_by(models.MealPlan.created_at.desc()).first()
        
        if not meal_plan:
            raise HTTPException(status_code=404, detail="No active meal plan found")
        
        # Get user's language preference
        user = db.query(models.User).filter(models.User.id == current_user["user_id"]).first()
        user_language = user.language if user else "en"
        logger.info(f"Updating meal with language {user_language} for user {current_user['user_id']}")
        
        # Generate new meal based on request
        meal_preferences = {
            "meal_type": update.meal_type,
            "special_request": update.request,
            "generate_full_recipe": True  # Flag to tell the AI to generate full recipe details
        }
        
        logger.debug(f"Generating recipe with preferences: {meal_preferences}")
        recipe_data = openrouter_client.generate_recipe(meal_preferences, language=user_language)
        logger.debug(f"Received recipe data: {recipe_data}")
        
        if not isinstance(recipe_data, dict):
            raise HTTPException(status_code=500, detail="Invalid recipe data received from AI")
        
        # Create nutrition record
        nutrition = models.Nutrition(
            calories=recipe_data.get("nutrition", {}).get("calories", 500),
            protein=recipe_data.get("nutrition", {}).get("protein", 20),
            carbs=recipe_data.get("nutrition", {}).get("carbs", 50),
            fat=recipe_data.get("nutrition", {}).get("fat", 25)
        )
        db.add(nutrition)
        db.flush()
        
        # Create recipe record
        recipe = models.Recipe(
            servings=recipe_data.get("servings", 4),
            prep_time=recipe_data.get("prep_time", 15),
            cook_time=recipe_data.get("cook_time", 20),
            difficulty=recipe_data.get("difficulty", "Medium"),
            instructions="\n".join(recipe_data.get("instructions", [])),
            tips="\n".join(recipe_data.get("tips", [])) if recipe_data.get("tips") else None,
            nutrition_id=nutrition.id
        )
        db.add(recipe)
        db.flush()
        
        # Create meal
        meal = models.Meal(
            name=recipe_data.get("name", "New Meal"),
            description=recipe_data.get("description", "A delicious meal"),
            emoji=recipe_data.get("emoji", "🍽️"),
            recipe_id=recipe.id
        )
        db.add(meal)
        db.flush()
        
        # Create recipe ingredients
        ingredients = []
        for ingredient_data in recipe_data.get("ingredients", []):
            if not isinstance(ingredient_data, dict):
                continue
                
            # Get or create ingredient
            ingredient = db.query(models.Ingredient).filter(
                models.Ingredient.name == ingredient_data.get("name")
            ).first()
            
            if not ingredient:
                ingredient = models.Ingredient(
                    name=ingredient_data.get("name", "Unknown Ingredient"),
                    default_unit=ingredient_data.get("unit", "pieces")
                )
                db.add(ingredient)
                db.flush()
            
            # Create recipe ingredient
            recipe_ingredient = models.RecipeIngredient(
                recipe_id=recipe.id,
                ingredient_id=ingredient.id,
                amount=ingredient_data.get("amount", 1),
                unit=ingredient_data.get("unit", "pieces"),
                notes=ingredient_data.get("notes")
            )
            db.add(recipe_ingredient)
            
            # Add to ingredients list for response
            ingredients.append({
                "name": ingredient_data.get("name"),
                "amount": ingredient_data.get("amount", 1),
                "unit": ingredient_data.get("unit", "pieces"),
                "notes": ingredient_data.get("notes")
            })
        
        # Update daily meal
        daily_meal = db.query(models.DailyMeal).filter(
            models.DailyMeal.meal_plan_id == meal_plan.id,
            models.DailyMeal.day_of_week == update.day_index % 7,  # Keep as 0-6 range
            models.DailyMeal.meal_type == update.meal_type
        ).first()
        
        if daily_meal:
            daily_meal.meal_id = meal.id
        else:
            daily_meal = models.DailyMeal(
                meal_plan_id=meal_plan.id,
                day_of_week=update.day_index % 7,  # Keep as 0-6 range
                meal_type=update.meal_type,
                meal_id=meal.id
            )
            db.add(daily_meal)
        
        # Delete all existing shopping items before creating new ones
        db.query(models.ShoppingItem).filter(
            models.ShoppingItem.meal_plan_id == meal_plan.id
        ).delete(synchronize_session=False)
        db.flush()
        
        # Get all daily meals to collect all ingredients
        all_daily_meals = db.query(models.DailyMeal).join(
            models.Meal, models.DailyMeal.meal_id == models.Meal.id
        ).join(
            models.Recipe, models.Meal.recipe_id == models.Recipe.id
        ).filter(
            models.DailyMeal.meal_plan_id == meal_plan.id
        ).all()
        
        all_ingredients = []
        
        # Collect ingredients from all meals
        for dm in all_daily_meals:
            if dm.meal and dm.meal.recipe:
                current_recipe = dm.meal.recipe
                recipe_ingredients = db.query(models.RecipeIngredient).filter(
                    models.RecipeIngredient.recipe_id == current_recipe.id
                ).all()
                
                # Add ingredients with their current amounts
                for ri in recipe_ingredients:
                    all_ingredients.append({
                        "name": ri.ingredient.name,
                        "amount": ri.amount,
                        "unit": ri.unit
                    })
        
        # Update shopping list items with all ingredients
        if all_ingredients:
            create_shopping_items(db, meal_plan.id, {"ingredients": all_ingredients})
        
        db.commit()
        
        # Return the meal data in the same format as get_meal_details
        return {
            "name": meal.name,
            "description": meal.description,
            "emoji": meal.emoji,
            "recipe": {
                "servings": recipe.servings,
                "prepTime": recipe.prep_time,
                "cookTime": recipe.cook_time,
                "difficulty": recipe.difficulty,
                "instructions": recipe.instructions.split("\n") if recipe.instructions else [],
                "ingredientDetails": ingredients,
                "tips": recipe.tips.split("\n") if recipe.tips else [],
                "nutrition": {
                    "calories": nutrition.calories,
                    "protein": nutrition.protein,
                    "carbs": nutrition.carbs,
                    "fat": nutrition.fat
                }
            }
        }
    except Exception as e:
        logger.error(f"Error updating meal: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/week/{year}/{week_number}")
async def get_week_meal_plan(
    year: int,
    week_number: int,
    current_user: dict = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    """Get a meal plan for a specific week."""
    # Validate week number
    if not 1 <= week_number <= 53:
        raise HTTPException(status_code=400, detail="Week number must be between 1 and 53")

    # Get the meal plan for the specified week
    meal_plan = db.query(models.MealPlan).filter(
        models.MealPlan.user_id == current_user["user_id"],
        models.MealPlan.week_number == week_number,
        models.MealPlan.year == year
    ).first()
    
    if not meal_plan:
        raise HTTPException(status_code=404, detail="No meal plan found for the specified week")
    
    # Get all daily meals for this plan
    daily_meals = db.query(models.DailyMeal).filter(
        models.DailyMeal.meal_plan_id == meal_plan.id
    ).order_by(models.DailyMeal.day_of_week).all()
    
    # Create the transformed data structure
    transformed_data = {
        "week_number": week_number,
        "year": year,
        "days": []
    }
    
    # Initialize empty days
    for _ in range(7):
        transformed_data["days"].append({
            "breakfast": None,
            "lunch": None,
            "dinner": None
        })
    
    # Fill in the meals we have
    for daily_meal in daily_meals:
        if not daily_meal.meal:
            continue
            
        # Validate day_of_week is within bounds
        if daily_meal.day_of_week < 0 or daily_meal.day_of_week >= 7:
            logger.warning(f"Invalid day_of_week value {daily_meal.day_of_week} for daily_meal {daily_meal.id}")
            continue
            
        meal = daily_meal.meal
        recipe = meal.recipe if meal.recipe else None
        
        # Create meal data structure
        meal_data = {
            "name": meal.name,
            "description": meal.description or "A delicious meal",
            "emoji": meal.emoji or "🍽️",
            "day": (daily_meal.day_of_week + 1),  # Convert from 0-6 back to 1-7
            "recipe": {
                "servings": recipe.servings if recipe else 4,
                "prepTime": recipe.prep_time if recipe else 15,
                "cookTime": recipe.cook_time if recipe else 20,
                "difficulty": recipe.difficulty if recipe else "Medium",
                "instructions": recipe.instructions.split("\n") if recipe and recipe.instructions else ["Prepare and cook according to your preferences"],
                "ingredientDetails": [
                    {
                        "name": ri.ingredient.name,
                        "amount": ri.amount,
                        "unit": ri.unit,
                        "notes": ri.notes
                    }
                    for ri in recipe.ingredients
                ] if recipe else [],
                "tips": recipe.tips.split("\n") if recipe and recipe.tips else ["Enjoy your meal!"],
                "nutrition": {
                    "calories": recipe.nutrition.calories,
                    "protein": recipe.nutrition.protein,
                    "carbs": recipe.nutrition.carbs,
                    "fat": recipe.nutrition.fat
                } if recipe and recipe.nutrition else None
            }
        }
        
        # Add to the appropriate day and meal type
        transformed_data["days"][daily_meal.day_of_week][daily_meal.meal_type] = meal_data
    
    return transformed_data

@router.get("/current")
async def get_current_meal_plan(
    current_user: dict = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    """Get the meal plan for the current week."""
    week_info = get_current_week_info()
    return await get_week_meal_plan(week_info.year, week_info.week_number, current_user, db)

@router.delete("/reset", status_code=status.HTTP_204_NO_CONTENT)
async def reset_meal_plans(
    current_user: dict = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    """Delete all meal plans and related data for the current user."""
    try:
        # Get all meal plans for the user
        meal_plans = db.query(models.MealPlan).filter(
            models.MealPlan.user_id == current_user["user_id"]
        ).all()

        for meal_plan in meal_plans:
            # First delete shopping items as they reference meal_plan_id
            db.query(models.ShoppingItem).filter(
                models.ShoppingItem.meal_plan_id == meal_plan.id
            ).delete(synchronize_session=False)

            # Get all daily meals to find related meals and recipes
            daily_meals = db.query(models.DailyMeal).filter(
                models.DailyMeal.meal_plan_id == meal_plan.id
            ).all()

            # Collect all meal, recipe and nutrition IDs to delete later
            meal_ids = []
            recipe_ids = []
            nutrition_ids = []

            # Collect all IDs first
            for daily_meal in daily_meals:
                if daily_meal.meal:
                    meal_ids.append(daily_meal.meal_id)
                    if daily_meal.meal.recipe:
                        recipe_ids.append(daily_meal.meal.recipe.id)
                        if daily_meal.meal.recipe.nutrition_id:
                            nutrition_ids.append(daily_meal.meal.recipe.nutrition_id)

            # Delete daily meals first (they reference meals)
            db.query(models.DailyMeal).filter(
                models.DailyMeal.meal_plan_id == meal_plan.id
            ).delete(synchronize_session=False)

            # Now safe to delete meals
            for meal_id in meal_ids:
                db.query(models.Meal).filter(
                    models.Meal.id == meal_id
                ).delete(synchronize_session=False)

            # Now safe to delete recipe ingredients
            for recipe_id in recipe_ids:
                db.query(models.RecipeIngredient).filter(
                    models.RecipeIngredient.recipe_id == recipe_id
                ).delete(synchronize_session=False)

            # Now safe to delete recipes
            for recipe_id in recipe_ids:
                db.query(models.Recipe).filter(
                    models.Recipe.id == recipe_id
                ).delete(synchronize_session=False)

            # Finally safe to delete nutrition records
            for nutrition_id in nutrition_ids:
                db.query(models.Nutrition).filter(
                    models.Nutrition.id == nutrition_id
                ).delete(synchronize_session=False)

            # Delete meal plan
            db.delete(meal_plan)

        db.commit()
        return None

    except Exception as e:
        logger.error(f"Error resetting meal plans: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reset meal plans: {str(e)}"
        )

class ServingsUpdateRequest(BaseModel):
    day_index: int
    meal_type: str
    servings: int

class BulkServingsUpdateRequest(BaseModel):
    servings: int

@router.put("/current/servings")
async def update_meal_servings(
    update: ServingsUpdateRequest,
    current_user: dict = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    """Update servings for a specific meal and recalculate shopping list."""
    try:
        # Get current week info
        week_info = get_current_week_info()
        
        # Get current meal plan
        meal_plan = db.query(models.MealPlan).filter(
            models.MealPlan.user_id == current_user["user_id"],
            models.MealPlan.week_number == week_info.week_number,
            models.MealPlan.year == week_info.year
        ).first()
        
        if not meal_plan:
            raise HTTPException(status_code=404, detail="Current meal plan not found")
        
        # Calculate day_of_week consistently
        day_of_week = update.day_index % 7  # Convert to 0-6 range
        logger.info(f"Looking for meal on day_of_week: {day_of_week}")
        
        # First, get and lock the daily meal
        daily_meal = db.query(models.DailyMeal).with_for_update().filter(
            models.DailyMeal.meal_plan_id == meal_plan.id,
            models.DailyMeal.day_of_week == day_of_week,
            models.DailyMeal.meal_type == update.meal_type
        ).first()
        
        if not daily_meal:
            logger.error(f"Meal not found for day {day_of_week} and type {update.meal_type}")
            raise HTTPException(status_code=404, detail="Meal not found")
        
        # Then get and lock the meal
        meal = db.query(models.Meal).with_for_update().filter(
            models.Meal.id == daily_meal.meal_id
        ).first()
        
        if not meal:
            logger.error(f"Meal not found with id {daily_meal.meal_id}")
            raise HTTPException(status_code=404, detail="Meal not found")
        
        # Finally get and lock the recipe
        recipe = db.query(models.Recipe).with_for_update().filter(
            models.Recipe.id == meal.recipe_id
        ).first()
        
        if not recipe:
            logger.error(f"Recipe not found for meal {meal.id}")
            raise HTTPException(status_code=404, detail="Recipe not found")
            
        logger.info(f"Current recipe servings: {recipe.servings}")
        logger.info(f"Updating to new servings: {update.servings}")
        
        # Store the original servings for ratio calculation
        original_servings = recipe.servings
        servings_ratio = update.servings / original_servings
        
        # Update the recipe servings
        recipe.servings = update.servings
        
        # Get and update recipe ingredients
        recipe_ingredients = db.query(models.RecipeIngredient).with_for_update().filter(
            models.RecipeIngredient.recipe_id == recipe.id
        ).all()
        
        # Update ingredient amounts
        for ri in recipe_ingredients:
            ri.amount = ri.amount * servings_ratio
        
        db.flush()
        logger.info(f"Updated recipe servings to {recipe.servings}")
        
        # Get all daily meals to preserve other meals' ingredients
        all_daily_meals = db.query(models.DailyMeal).join(
            models.Meal, models.DailyMeal.meal_id == models.Meal.id
        ).join(
            models.Recipe, models.Meal.recipe_id == models.Recipe.id
        ).filter(
            models.DailyMeal.meal_plan_id == meal_plan.id
        ).all()
        
        all_ingredients = []
        
        # Collect ingredients from all meals
        for dm in all_daily_meals:
            if dm.meal and dm.meal.recipe:
                current_recipe = dm.meal.recipe
                recipe_ingredients = db.query(models.RecipeIngredient).filter(
                    models.RecipeIngredient.recipe_id == current_recipe.id
                ).all()
                
                # Add ingredients with their current amounts (already updated if this is the changed meal)
                for ri in recipe_ingredients:
                    all_ingredients.append({
                        "name": ri.ingredient.name,
                        "amount": ri.amount,
                        "unit": ri.unit
                    })
        
        # Delete all existing shopping items before creating new ones
        db.query(models.ShoppingItem).filter(
            models.ShoppingItem.meal_plan_id == meal_plan.id
        ).delete(synchronize_session=False)
        db.flush()
        
        # Update shopping list items with all ingredients
        if all_ingredients:
            create_shopping_items(db, meal_plan.id, {"ingredients": all_ingredients})
        
        db.commit()
        
        # Verify the update after commit
        updated_recipe = db.query(models.Recipe).filter(
            models.Recipe.id == recipe.id
        ).first()
        logger.info(f"Final verification - Recipe servings after commit: {updated_recipe.servings}")
        
        return {"message": f"Servings updated successfully to {update.servings}"}
        
    except Exception as e:
        logger.error(f"Error updating meal servings: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/current/servings/bulk")
async def update_all_meal_servings(
    update: BulkServingsUpdateRequest,
    current_user: dict = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    """Update servings for all meals in the current plan."""
    try:
        # Get current week info
        week_info = get_current_week_info()
        
        # Get current meal plan
        meal_plan = db.query(models.MealPlan).filter(
            models.MealPlan.user_id == current_user["user_id"],
            models.MealPlan.week_number == week_info.week_number,
            models.MealPlan.year == week_info.year
        ).first()
        
        if not meal_plan:
            raise HTTPException(status_code=404, detail="Current meal plan not found")
        
        # Get all daily meals with their recipes
        daily_meals = db.query(models.DailyMeal).with_for_update().filter(
            models.DailyMeal.meal_plan_id == meal_plan.id
        ).all()
        
        all_ingredients = []
        
        # Update servings for each meal and collect ingredients
        for daily_meal in daily_meals:
            if not daily_meal.meal:
                continue
                
            # Get and lock the meal
            meal = db.query(models.Meal).with_for_update().filter(
                models.Meal.id == daily_meal.meal_id
            ).first()
            
            if not meal or not meal.recipe:
                continue
                
            # Get and lock the recipe
            recipe = db.query(models.Recipe).with_for_update().filter(
                models.Recipe.id == meal.recipe_id
            ).first()
            
            if not recipe:
                continue
                
            logger.info(f"Updating recipe {recipe.id} servings from {recipe.servings} to {update.servings}")
            
            # Store original servings for ratio calculation
            original_servings = recipe.servings
            servings_ratio = update.servings / original_servings
            
            # Update recipe servings
            recipe.servings = update.servings
            
            # Get and update recipe ingredients
            recipe_ingredients = db.query(models.RecipeIngredient).with_for_update().filter(
                models.RecipeIngredient.recipe_id == recipe.id
            ).all()
            
            # Update ingredient amounts and collect for shopping list
            for ri in recipe_ingredients:
                # Update the ingredient amount in the database
                ri.amount = ri.amount * servings_ratio
                
                all_ingredients.append({
                    "name": ri.ingredient.name,
                    "amount": ri.amount,
                    "unit": ri.unit
                })
        
        # Delete all existing shopping items before creating new ones
        db.query(models.ShoppingItem).filter(
            models.ShoppingItem.meal_plan_id == meal_plan.id
        ).delete(synchronize_session=False)
        db.flush()
        
        # Update shopping list items with all ingredients
        if all_ingredients:
            create_shopping_items(db, meal_plan.id, {"ingredients": all_ingredients})
        
        db.commit()
        return {"message": "All servings updated successfully"}
        
    except Exception as e:
        logger.error(f"Error updating all meal servings: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e)) 