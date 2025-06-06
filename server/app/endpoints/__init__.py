"""
FastAPI endpoints for the AI Meal Planner API.
"""

from . import auth, preferences, recipes, ingredients, meal_plans, shopping_list, profile

__all__ = [
    "auth",
    "preferences",
    "recipes",
    "ingredients",
    "meal_plans",
    "shopping_list",
    "profile"
] 