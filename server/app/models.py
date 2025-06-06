from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, CheckConstraint, Boolean, JSON, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    hashed_password = Column(String)
    language = Column(String, default="en")  
    role = Column(String, default="user")  
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    preferences = relationship("UserPreference", back_populates="user")
    meal_plans = relationship("MealPlan", back_populates="user")
    ingredients = relationship("UserIngredient", back_populates="user")
    refresh_tokens = relationship("RefreshToken", back_populates="user")

class Ingredient(Base):
    __tablename__ = "ingredients"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    emoji = Column(String)
    default_unit = Column(String)
    
    recipe_ingredients = relationship("RecipeIngredient", back_populates="ingredient")
    user_ingredients = relationship("UserIngredient", back_populates="ingredient")
    shopping_items = relationship("ShoppingItem", back_populates="ingredient")

class Recipe(Base):
    __tablename__ = "recipes"
    
    id = Column(Integer, primary_key=True, index=True)
    servings = Column(Integer)
    prep_time = Column(Integer)
    cook_time = Column(Integer)
    difficulty = Column(String)
    instructions = Column(Text)
    tips = Column(Text)
    nutrition_id = Column(Integer, ForeignKey("nutrition.id"))
    
    nutrition = relationship("Nutrition", back_populates="recipe")
    ingredients = relationship("RecipeIngredient", back_populates="recipe")
    meals = relationship("Meal", back_populates="recipe")

class RecipeIngredient(Base):
    __tablename__ = "recipe_ingredients"
    
    id = Column(Integer, primary_key=True, index=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id"))
    ingredient_id = Column(Integer, ForeignKey("ingredients.id"))
    amount = Column(Float)
    unit = Column(String)
    notes = Column(Text)
    
    recipe = relationship("Recipe", back_populates="ingredients")
    ingredient = relationship("Ingredient", back_populates="recipe_ingredients")

class UserIngredient(Base):
    __tablename__ = "user_ingredients"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    ingredient_id = Column(Integer, ForeignKey("ingredients.id"))
    quantity = Column(Float)
    unit = Column(String)
    
    user = relationship("User", back_populates="ingredients")
    ingredient = relationship("Ingredient", back_populates="user_ingredients")

class Meal(Base):
    __tablename__ = "meals"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    description = Column(Text, nullable=True)
    emoji = Column(String, nullable=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id"))
    servings = Column(Integer, default=4)
    leftover_from = Column(Integer, nullable=True)  
    makes_leftovers_for = Column(Integer, nullable=True)  
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    recipe = relationship("Recipe", back_populates="meals")
    daily_meals = relationship("DailyMeal", back_populates="meal")

class UserPreference(Base):
    __tablename__ = "user_preferences"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    preferences = Column(Text)
    
    user = relationship("User", back_populates="preferences")

class MealPlan(Base):
    __tablename__ = "meal_plans"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    week_number = Column(Integer, nullable=False)  
    year = Column(Integer, nullable=False)  
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="meal_plans")
    daily_meals = relationship("DailyMeal", back_populates="meal_plan")
    shopping_items = relationship("ShoppingItem", back_populates="meal_plan")

    __table_args__ = (
        
        CheckConstraint('week_number >= 1 AND week_number <= 53'),
        UniqueConstraint('user_id', 'week_number', 'year', name='unique_user_week_year'),
    )

class DailyMeal(Base):
    __tablename__ = "daily_meals"
    
    id = Column(Integer, primary_key=True, index=True)
    meal_plan_id = Column(Integer, ForeignKey("meal_plans.id"))
    day_of_week = Column(Integer, CheckConstraint("day_of_week >= 0 AND day_of_week < 7"))  
    meal_type = Column(String)  
    meal_id = Column(Integer, ForeignKey("meals.id"))
    
    meal_plan = relationship("MealPlan", back_populates="daily_meals")
    meal = relationship("Meal", back_populates="daily_meals")

class Nutrition(Base):
    __tablename__ = "nutrition"
    
    id = Column(Integer, primary_key=True, index=True)
    calories = Column(Float)
    protein = Column(Float)
    carbs = Column(Float)
    fat = Column(Float)
    
    recipe = relationship("Recipe", back_populates="nutrition")

class ShoppingItem(Base):
    __tablename__ = "shopping_items"
    
    id = Column(Integer, primary_key=True, index=True)
    meal_plan_id = Column(Integer, ForeignKey("meal_plans.id"))
    ingredient_id = Column(Integer, ForeignKey("ingredients.id"), nullable=False)
    quantity_needed = Column(Float)
    unit = Column(String)
    category = Column(String)
    bought = Column(Boolean, default=False)  
    
    meal_plan = relationship("MealPlan", back_populates="shopping_items")
    ingredient = relationship("Ingredient", back_populates="shopping_items", lazy="joined")

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    token = Column(String, unique=True, index=True)
    expires_at = Column(DateTime, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"))
    is_revoked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="refresh_tokens") 