# AI Meal Planner API

A FastAPI-based meal planning application that uses AI to generate personalized recipes and meal plans.

## Features

- User authentication and management
- AI-powered recipe generation
- Personalized meal plan creation
- Shopping list generation
- User preferences management
- PostgreSQL database integration
- OpenRouter API integration for structured AI responses

## Prerequisites

- Python 3.8+
- PostgreSQL
- OpenRouter API key

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd ai-meal-planner
```

2. Create a virtual environment and activate it:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file in the root directory with the following content:
```
DATABASE_URL=postgresql://username:password@localhost:5432/meal_planner
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=30
OPENROUTER_API_KEY=your-openrouter-api-key-here
```

5. Create the database:
```bash
createdb meal_planner
```

6. Run database migrations:
```bash
alembic upgrade head
```

## Running the Application

Start the FastAPI server:
```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`

## API Documentation

Once the server is running, you can access:
- Interactive API documentation: `http://localhost:8000/docs`
- Alternative API documentation: `http://localhost:8000/redoc`

## API Endpoints

### Authentication (`/auth`)
- `POST /auth/token` - Login and get access token and refresh token
- `POST /auth/refresh` - Refresh access token using refresh token
- `POST /auth/logout` - Logout and revoke refresh token
- `POST /auth/register` - Create new user account

### User Profile (`/users`)
- `GET /users/profile` - Get user profile information
- `PUT /users/profile` - Update user profile information

### User Preferences (`/preferences`)
- `GET /preferences` - Get user preferences
- `PUT /preferences` - Update user preferences

### Recipes (`/recipes`)
- `POST /recipes/generate` - Generate a new recipe based on preferences
- `GET /recipes/{recipe_id}` - Get recipe details

### Meal Plans (`/meal-plans`)
- `POST /meal-plans/generate` - Generate a meal plan with optional days parameter
- `GET /meal-plans/current` - Get current week's meal plan
- `GET /meal-plans/week/{year}/{week}` - Get meal plan for specific week
- `PUT /meal-plans/current/meals` - Update a meal in current plan
- `DELETE /meal-plans/reset` - Reset all meal plans

### Shopping List (`/shopping-list`)
- `GET /shopping-list/current` - Get current shopping list

### Ingredients (`/ingredients`)
- `GET /ingredients/common` - Get list of common ingredients
- `GET /ingredients/user` - Get user's ingredients
- `POST /ingredients/user` - Add new ingredient to user's list
- `PUT /ingredients/user/{id}` - Update user's ingredient
- `DELETE /ingredients/user/{id}` - Delete user's ingredient

## Database Schema

The application uses a PostgreSQL database with the following main tables:
- users
- recipes
- meals
- meal_plans
- ingredients
- recipe_ingredients
- user_ingredients
- shopping_items
- nutrition
- user_preferences

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 