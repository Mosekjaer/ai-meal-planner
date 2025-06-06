from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
import os
from . import models
from .database import engine
from .endpoints import auth, preferences, ingredients, recipes, meal_plans, shopping_list, profile
from .logging_config import setup_logging
import uvicorn

setup_logging()
logger = logging.getLogger(__name__)

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Meal Planner API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("CORS_ALLOWED_ORIGIN", "http://localhost:5173")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

app.include_router(auth.router, prefix="/api")
app.include_router(preferences.router, prefix="/api/users")
app.include_router(ingredients.router, prefix="/api")
app.include_router(recipes.router, prefix="/api")
app.include_router(meal_plans.router, prefix="/api")
app.include_router(shopping_list.router, prefix="/api")
app.include_router(profile.router, prefix="/api")

logger.info("Application startup complete")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000) 