import requests
import os
from typing import Dict, List, Optional
from dotenv import load_dotenv
import logging
import json
from sqlalchemy.orm import Session
from app import models
from app.database import get_db


logger = logging.getLogger(__name__)

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
API_URL = "https://openrouter.ai/api/v1/chat/completions"

class OpenRouterClient:
    def __init__(self):
        logger.debug("Initializing OpenRouterClient")
        if not OPENROUTER_API_KEY:
            logger.error("OPENROUTER_API_KEY environment variable is not set")
            raise ValueError("OPENROUTER_API_KEY environment variable is not set")
            
        self.headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
        }
        
        self.language_prompts = {
            "en": {
                "meal_plan": "Create a {days}-day meal plan that matches these preferences:\n"
                           "Dietary restrictions: {restrictions}\n"
                           "Calories per day: {calories}\n"
                           "Meal complexity: {complexity}\n"
                           "Cuisine preferences: {cuisine}\n\n"
                           "Please create a high-level meal plan first, considering:\n"
                           "1. Meals that can be prepared in batches\n"
                           "2. Using leftovers efficiently\n"
                           "3. Balanced nutrition throughout the week\n"
                           "4. Progressive difficulty of recipes",
                "recipe": "Create a recipe for {meal_name} that matches these preferences:\n"
                         "Dietary restrictions: {restrictions}\n"
                         "Cuisine type: {cuisine}\n"
                         "Cooking skill level: {skill_level}\n"
                         "Maximum preparation time: {prep_time} minutes\n\n"
                         "Please generate a detailed recipe with exact measurements, clear instructions, and complete nutritional information."
            },
            "no": {
                "meal_plan": "Lag en {days}-dagers måltidsplan som matcher disse preferansene:\n"
                           "Kostholdsbegrensninger: {restrictions}\n"
                           "Kalorier per dag: {calories}\n"
                           "Måltidskompleksitet: {complexity}\n"
                           "Matpreferanser: {cuisine}\n\n"
                           "Vennligst lag først en overordnet måltidsplan, og vurder:\n"
                           "1. Måltider som kan tilberedes i større porsjoner\n"
                           "2. Effektiv bruk av rester\n"
                           "3. Balansert ernæring gjennom uken\n"
                           "4. Progressiv vanskelighetsgrad på oppskriftene",
                "recipe": "Lag en oppskrift for {meal_name} som matcher disse preferansene:\n"
                         "Kostholdsbegrensninger: {restrictions}\n"
                         "Mattype: {cuisine}\n"
                         "Kokkenivå: {skill_level}\n"
                         "Maksimal tilberedningstid: {prep_time} minutter\n\n"
                         "Vennligst generer en detaljert oppskrift med nøyaktige mål, klare instruksjoner og fullstendig ernæringsinformasjon."
            },
            "dk": {
                "meal_plan": "Lav en {days}-dages måltidsplan, der matcher disse præferencer:\n"
                           "Kostbegrænsninger: {restrictions}\n"
                           "Kalorier per dag: {calories}\n"
                           "Måltidskompleksitet: {complexity}\n"
                           "Madpræferencer: {cuisine}\n\n"
                           "Lav først en overordnet måltidsplan, og overvej:\n"
                           "1. Måltider der kan tilberedes i større portioner\n"
                           "2. Effektiv brug af rester\n"
                           "3. Balanceret ernæring gennem ugen\n"
                           "4. Progressiv sværhedsgrad af opskrifterne",
                "recipe": "Lav en opskrift på {meal_name} der matcher disse præferencer:\n"
                         "Kostbegrænsninger: {restrictions}\n"
                         "Madtype: {cuisine}\n"
                         "Madlavningsniveau: {skill_level}\n"
                         "Maksimal tilberedningstid: {prep_time} minutter\n\n"
                         "Generer venligst en detaljeret opskrift med præcise mål, klare instruktioner og komplet ernæringsinformation."
            }
            
        }
        
        logger.debug("OpenRouterClient initialized successfully")

    def parse_ingredient_string(self, ingredient_str: str) -> dict:
        """Parse an ingredient string into amount, unit, and name components."""
        import re
        
        amount_pattern = r'(\d+(?:\.\d+)?)'  
        unit_pattern = r'(?:cup|cups|tbsp|tsp|g|ml|oz|pound|pounds|piece|pieces|stk|gram|grams)'
        
        match = re.match(f'^{amount_pattern}\s*({unit_pattern})\s+(.+)$', ingredient_str, re.IGNORECASE)
        if match:
            amount, unit, name = match.groups()
            return {
                "amount": float(amount),
                "unit": unit.lower(),
                "name": name.strip()
            }
        
        return {
            "amount": 1,
            "unit": "pieces",
            "name": ingredient_str
        }

    def process_ingredients(self, ingredients: list) -> list:
        """Process a list of ingredients to ensure they have the required fields."""
        processed = []
        for ing in ingredients:
            if isinstance(ing, dict):
                
                if "amount" not in ing or isinstance(ing.get("unit"), str) and any(char.isdigit() for char in ing["unit"]):
                    
                    unit_str = ing.get("unit", "")
                    if any(char.isdigit() for char in unit_str):
                        parsed = self.parse_ingredient_string(f"{unit_str} {ing['name']}")
                        ing.update(parsed)
                    else:
                        
                        ing["amount"] = ing.get("amount", 1)
                        ing["unit"] = ing.get("unit", "pieces")
                
                processed.append({
                    "name": ing["name"],
                    "amount": float(ing.get("amount", 1)),
                    "unit": ing.get("unit", "pieces"),
                    "notes": ing.get("notes", "")
                })
            else:
                
                parsed = self.parse_ingredient_string(str(ing))
                processed.append(parsed)
        
        return processed

    def generate_recipe(self, preferences: Dict, language: str = "en") -> Dict:
        logger.debug(f"Generating recipe with preferences: {preferences} in {language}")
        
        prompt_template = self.language_prompts.get(language, self.language_prompts["en"])["recipe"]
        prompt = prompt_template.format(
            meal_name=preferences.get('meal_name', ''),
            restrictions=preferences.get('dietary_restrictions', 'None'),
            cuisine=preferences.get('cuisine_type', 'Any'),
            skill_level=preferences.get('skill_level', 'Any'),
            prep_time=preferences.get('max_prep_time', 'Any')
        )

        recipe_schema = {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "name": {"type": "string", "description": "Recipe name"},
                "servings": {"type": "integer", "description": "Number of servings"},
                "prep_time": {"type": "integer", "description": "Preparation time in minutes"},
                "cook_time": {"type": "integer", "description": "Cooking time in minutes"},
                "difficulty": {"type": "string", "enum": ["easy", "medium", "hard"]},
                "ingredients": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "name": {"type": "string", "description": "Ingredient name"},
                            "amount": {"type": "number", "description": "Quantity of the ingredient"},
                            "unit": {"type": "string", "description": "Unit of measurement (e.g., g, ml, pieces)"},
                            "notes": {"type": "string", "description": "Additional notes about the ingredient"}
                        },
                        "required": ["name", "amount", "unit", "notes"]
                    }
                },
                "instructions": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "tips": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "nutrition": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "calories": {"type": "integer"},
                        "protein": {"type": "integer"},
                        "carbs": {"type": "integer"},
                        "fat": {"type": "integer"}
                    },
                    "required": ["calories", "protein", "carbs", "fat"]
                }
            },
            "required": ["name", "servings", "prep_time", "cook_time", "difficulty", "ingredients", "instructions", "tips", "nutrition"]
        }

        try:
            response = requests.post(
                API_URL,
                headers=self.headers,
                json={
                    "model": "openai/gpt-4o-2024-11-20",
                    "messages": [
                        {"role": "user", "content": prompt}
                    ],
                    "response_format": {
                        "type": "json_schema",
                        "json_schema": {
                            "name": "recipe",
                            "strict": True,
                            "schema": recipe_schema
                        }
                    }
                }
            )
            
            if response.status_code != 200:
                raise Exception(f"OpenRouter API error: {response.text}")
            
            response_json = response.json()
            logger.debug(f"Successfully received response from OpenRouter: {response_json}")
            
            
            recipe_content = json.loads(response_json["choices"][0]["message"]["content"])
            
            
            if "prepTime" in recipe_content:
                recipe_content["prep_time"] = recipe_content.pop("prepTime")
            if "cookTime" in recipe_content:
                recipe_content["cook_time"] = recipe_content.pop("cookTime")
                
            logger.debug(f"Parsed recipe content: {recipe_content}")

            
            if "ingredients" in recipe_content:
                recipe_content["ingredients"] = self.process_ingredients(recipe_content["ingredients"])

            return recipe_content
            
        except requests.exceptions.RequestException as e:
            error_msg = f"Network error while calling OpenRouter API: {str(e)}"
            logger.error(error_msg)
            raise Exception(error_msg)
        except json.JSONDecodeError as e:
            error_msg = f"Error parsing OpenRouter response JSON: {str(e)}"
            logger.error(error_msg)
            raise Exception(error_msg)
        except Exception as e:
            error_msg = f"Error processing OpenRouter response: {str(e)}"
            logger.error(error_msg)
            raise Exception(error_msg)

    def generate_meal_plan(self, preferences: Dict, days: int = 7, language: str = "en") -> Dict:
        logger.debug(f"Generating meal plan with preferences: {preferences} for {days} days in {language}")
        
        
        if language not in self.language_prompts:
            logger.warning(f"Language '{language}' not supported, defaulting to English")
            language = "en"
        
        
        high_level_plan_schema = {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "days": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "day": {"type": "integer"},
                            "meals": {
                                "type": "object",
                                "additionalProperties": False,
                                "properties": {
                                    "breakfast": {
                                        "type": "object",
                                        "additionalProperties": False,
                                        "properties": {
                                            "name": {"type": "string"},
                                            "servings": {"type": "integer"},
                                            "prep_time": {"type": "integer"},
                                            "cook_time": {"type": "integer"},
                                            "difficulty": {"type": "string"},
                                            "leftover_from": {"type": "integer", "nullable": True},
                                            "makes_leftovers_for": {"type": "integer", "nullable": True},
                                            "ingredients": {
                                                "type": "array",
                                                "items": {
                                                    "type": "object",
                                                    "additionalProperties": False,
                                                    "properties": {
                                                        "name": {"type": "string", "description": "Ingredient name"},
                                                        "amount": {"type": "number", "description": "Quantity of the ingredient"},
                                                        "unit": {"type": "string", "description": "Unit of measurement (e.g., g, ml, pieces)"},
                                                        "notes": {"type": "string", "description": "Additional notes about the ingredient"}
                                                    },
                                                    "required": ["name", "amount", "unit", "notes"]
                                                }
                                            }
                                        },
                                        "required": ["name", "servings", "prep_time", "cook_time", "difficulty", "leftover_from", "makes_leftovers_for", "ingredients"]
                                    },
                                    "lunch": {
                                        "type": "object",
                                        "additionalProperties": False,
                                        "properties": {
                                            "name": {"type": "string"},
                                            "servings": {"type": "integer"},
                                            "prep_time": {"type": "integer"},
                                            "cook_time": {"type": "integer"},
                                            "difficulty": {"type": "string"},
                                            "leftover_from": {"type": "integer", "nullable": True},
                                            "makes_leftovers_for": {"type": "integer", "nullable": True},
                                            "ingredients": {
                                                "type": "array",
                                                "items": {
                                                    "type": "object",
                                                    "additionalProperties": False,
                                                    "properties": {
                                                        "name": {"type": "string", "description": "Ingredient name"},
                                                        "amount": {"type": "number", "description": "Quantity of the ingredient"},
                                                        "unit": {"type": "string", "description": "Unit of measurement (e.g., g, ml, pieces)"},
                                                        "notes": {"type": "string", "description": "Additional notes about the ingredient"}
                                                    },
                                                    "required": ["name", "amount", "unit", "notes"]
                                                }
                                            }
                                        },
                                        "required": ["name", "servings", "prep_time", "cook_time", "difficulty", "leftover_from", "makes_leftovers_for", "ingredients"]
                                    },
                                    "dinner": {
                                        "type": "object",
                                        "additionalProperties": False,
                                        "properties": {
                                            "name": {"type": "string"},
                                            "servings": {"type": "integer"},
                                            "prep_time": {"type": "integer"},
                                            "cook_time": {"type": "integer"},
                                            "difficulty": {"type": "string"},
                                            "leftover_from": {"type": "integer", "nullable": True},
                                            "makes_leftovers_for": {"type": "integer", "nullable": True},
                                            "ingredients": {
                                                "type": "array",
                                                "items": {
                                                    "type": "object",
                                                    "additionalProperties": False,
                                                    "properties": {
                                                        "name": {"type": "string", "description": "Ingredient name"},
                                                        "amount": {"type": "number", "description": "Quantity of the ingredient"},
                                                        "unit": {"type": "string", "description": "Unit of measurement (e.g., g, ml, pieces)"},
                                                        "notes": {"type": "string", "description": "Additional notes about the ingredient"}
                                                    },
                                                    "required": ["name", "amount", "unit", "notes"]
                                                }
                                            }
                                        },
                                        "required": ["name", "servings", "prep_time", "cook_time", "difficulty", "leftover_from", "makes_leftovers_for", "ingredients"]
                                    }
                                }
                            }
                        },
                        "required": ["day", "meals"]
                    }
                }
            },
            "required": ["days"]
        }

        prompt_template = self.language_prompts.get(language, self.language_prompts["en"])["meal_plan"]
        
        
        meal_types = preferences.get('meal_types', ['dinner'])  
        
        prompt = prompt_template.format(
            days=days,
            restrictions=preferences.get('dietary_restrictions', 'None'),
            calories=preferences.get('calories_per_day', 'Any'),
            complexity=preferences.get('meal_complexity', 'Any'),
            cuisine=preferences.get('cuisine_preferences', 'Any')
        )
        
        
        prompt += f"\nPlease only generate meals for: {', '.join(meal_types)}"

        try:
            response = requests.post(
                API_URL,
                headers=self.headers,
                json={
                    "model": "openai/gpt-4o-2024-11-20",
                    "messages": [
                        {"role": "user", "content": prompt}
                    ],
                    "response_format": {
                        "type": "json_schema",
                        "json_schema": {
                            "name": "meal_plan",
                            "strict": True,
                            "schema": high_level_plan_schema
                        }
                    }
                }
            )
            
            if response.status_code != 200:
                logger.error(f"OpenRouter API returned non-200 status code: {response.status_code}")
                logger.error(f"Response text: {response.text}")
                raise Exception(f"OpenRouter API error: {response.text}")
                
            logger.debug(f"Raw API response: {response.text}")
            response_json = response.json()
            logger.debug(f"Parsed API response JSON: {json.dumps(response_json, indent=2)}")
            
            try:
                content = response_json["choices"][0]["message"]["content"]
                logger.debug(f"Content to parse: {content}")
                high_level_plan = json.loads(content)
                logger.debug(f"Successfully parsed high-level plan: {json.dumps(high_level_plan, indent=2)}")
            except (KeyError, IndexError) as e:
                logger.error(f"Error accessing response structure: {str(e)}")
                logger.error(f"Response JSON structure: {json.dumps(response_json, indent=2)}")
                raise Exception(f"Unexpected API response structure: {str(e)}")
            except json.JSONDecodeError as e:
                logger.error(f"Error parsing content as JSON: {str(e)}")
                logger.error(f"Content that failed to parse: {content}")
                raise Exception(f"Invalid JSON in API response content: {str(e)}")
            
            
            for day in high_level_plan["days"]:
                for meal_type in meal_types:  
                    if meal_type in day["meals"] and day["meals"][meal_type]:
                        meal = day["meals"][meal_type]
                        if meal.get("leftover_from"):
                            
                            original_day = meal["leftover_from"]
                            original_meal = next(
                                d["meals"][meal_type] for d in high_level_plan["days"] 
                                if d["day"] == original_day
                            )
                            meal["recipe"] = original_meal["recipe"]
                        else:
                            
                            recipe = self.generate_recipe({
                                "meal_name": meal["name"],
                                "meal_type": meal_type,
                                "dietary_restrictions": preferences.get("dietary_restrictions"),
                                "cuisine_type": preferences.get("cuisine_preferences"),
                                "skill_level": preferences.get("meal_complexity")
                            }, language)
                            meal["recipe"] = recipe
            
            
            for day in high_level_plan["days"]:
                for meal_type, meal in day["meals"].items():
                    if meal and "ingredients" in meal:
                        meal["ingredients"] = self.process_ingredients(meal["ingredients"])

            return high_level_plan
            
        except Exception as e:
            error_msg = f"Error processing meal plan: {str(e)}"
            logger.error(error_msg)
            raise Exception(error_msg)

    def _create_recipe_prompt(self, preferences: Dict) -> str:
        return f"""Create a recipe that matches these preferences:
        Dietary restrictions: {preferences.get('dietary_restrictions', 'None')}
        Cuisine type: {preferences.get('cuisine_type', 'Any')}
        Cooking skill level: {preferences.get('skill_level', 'Any')}
        Maximum preparation time: {preferences.get('max_prep_time', 'Any')} minutes
        
        Please generate a detailed recipe with exact measurements, clear instructions, and complete nutritional information."""

    def _create_meal_plan_prompt(self, preferences: Dict, days: int) -> str:
        return f"""Create a {days}-day meal plan that matches these preferences:
        Dietary restrictions: {preferences.get('dietary_restrictions', 'None')}
        Calories per day: {preferences.get('calories_per_day', 'Any')}
        Meal complexity: {preferences.get('meal_complexity', 'Any')}
        Cuisine preferences: {preferences.get('cuisine_preferences', 'Any')}
        
        Please generate a meal plan with different meals for breakfast, lunch, and dinner each day."""

    def save_recipe(self, recipe_data: Dict, meal_data: Dict, nutrition: models.Nutrition, db: Session):
        
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

        
        meal = models.Meal(
            name=meal_data["name"],
            description=meal_data.get("description", ""),
            emoji=meal_data.get("emoji", "🍽️"),
            recipe_id=recipe.id,
            servings=meal_data["servings"],
            leftover_from=meal_data.get("leftover_from"),
            makes_leftovers_for=meal_data.get("makes_leftovers_for")
        )
        db.add(meal)
        db.flush()

        
        for ingredient_data in recipe_data.get("ingredients", []):
            
            ingredient = db.query(models.Ingredient).filter(
                models.Ingredient.name == ingredient_data["name"]
            ).first()
            
            if not ingredient:
                ingredient = models.Ingredient(
                    name=ingredient_data["name"],
                    default_unit=ingredient_data["unit"]
                )
                db.add(ingredient)
                db.flush()
            
            
            recipe_ingredient = models.RecipeIngredient(
                recipe_id=recipe.id,
                ingredient_id=ingredient.id,
                amount=ingredient_data["amount"],
                unit=ingredient_data["unit"],
                notes=ingredient_data.get("notes")
            )
            db.add(recipe_ingredient) 