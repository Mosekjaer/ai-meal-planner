export interface Ingredient {
  name: string
  quantity: number
  unit: string
  emoji?: string
  default_unit?: string
}

export interface Meal {
  name: string
  description: string
  ingredients: string[]
  emoji: string
  recipe: Recipe
}

export interface Recipe {
  servings: number
  prepTime: number
  cookTime: number
  difficulty: "Easy" | "Medium" | "Hard"
  instructions: string[]
  ingredientDetails: IngredientDetail[]
  tips?: string[]
  nutrition?: {
    calories: number
    protein: number
    carbs: number
    fat: number
  }
}

export interface IngredientDetail {
  name: string
  amount: number
  unit: string
  notes?: string
}

export interface DayMeals {
  breakfast: Meal
  lunch: Meal
  dinner: Meal
}

export interface MealPlan {
  week_number: number
  year: number
  days: {
    breakfast?: Meal | null
    lunch?: Meal | null
    dinner?: Meal | null
  }[]
  _timestamp?: number
}

export interface UserPreferences {
  dietary_restrictions: string[]
  calories_per_day: number
  meal_complexity: string
  cuisine_preferences: string[]
  meal_types: ("breakfast" | "lunch" | "dinner")[]
}

export interface ShoppingItem {
  id: number
  name: string
  quantity: number
  needed: number
  unit: string
  category: string
  bought: boolean
}
