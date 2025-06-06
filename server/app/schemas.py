from typing import List, Optional, Literal, Dict
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: Optional[str] = "user"  

class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str

class TokenRefresh(BaseModel):
    refresh_token: str

class RecipeCreate(BaseModel):
    servings: int
    prep_time: int
    cook_time: int
    difficulty: str
    instructions: str
    tips: Optional[str] = None

class RecipeResponse(BaseModel):
    id: int
    servings: int
    prep_time: int
    cook_time: int
    difficulty: str
    instructions: str
    tips: Optional[str]

    class Config:
        from_attributes = True

class UserPreferencesUpdate(BaseModel):
    dietary_restrictions: Optional[List[str]] = None
    calories_per_day: Optional[int] = None
    meal_complexity: Optional[str] = None
    cuisine_preferences: Optional[List[str]] = None

class IngredientBase(BaseModel):
    name: str
    quantity: float
    unit: str

class IngredientCreate(IngredientBase):
    emoji: Optional[str] = None
    default_unit: Optional[str] = None

class IngredientResponse(IngredientBase):
    id: int
    emoji: Optional[str]
    default_unit: str

    class Config:
        from_attributes = True

class MealUpdateRequest(BaseModel):
    day_index: int
    meal_type: str
    request: str

class WeekInfo(BaseModel):
    week_number: int = Field(..., ge=1, le=53, description="ISO week number (1-53)")
    year: int = Field(..., ge=2024, le=2100, description="Year for the week number")

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    language: Optional[str] = Field(None, description="ISO 639-1 language code (e.g., 'en', 'es', 'fr')")

class UserProfileResponse(BaseModel):
    id: int
    email: str
    name: str
    language: Optional[str] = None

    class Config:
        from_attributes = True

class MealPlanCreate(BaseModel):
    week_info: Optional[WeekInfo] = None
    preferences: Optional[Dict] = None

class MealRecipeResponse(BaseModel):
    servings: int
    prepTime: int
    cookTime: int
    difficulty: str
    instructions: List[str]
    ingredientDetails: List[Dict]
    tips: List[str]
    nutrition: Optional[Dict]

class MealResponse(BaseModel):
    name: str
    description: str
    emoji: str
    recipe: MealRecipeResponse

class DayMealsResponse(BaseModel):
    breakfast: Optional[MealResponse]
    lunch: Optional[MealResponse]
    dinner: Optional[MealResponse]

class MealPlanResponse(BaseModel):
    week_number: int
    year: int
    days: List[DayMealsResponse] 