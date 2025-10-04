from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from supabase_client import supabase_service
from dotenv import load_dotenv
import os
import json
import requests

load_dotenv()

app = FastAPI(title="AntojosGo API", version="2.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Firebase project configuration
FIREBASE_PROJECT_ID = "antojosgo-96e1c"

# Pydantic models
class User(BaseModel):
    id: str
    name: str
    email: str
    profile_image: Optional[str] = None
    firebase_uid: str

class Restaurant(BaseModel):
    id: str
    name: str
    description: str
    category: str
    address: str
    coordinates: Dict[str, float]  # {latitude: float, longitude: float}
    image_url: Optional[str] = None
    rating: Optional[float] = None
    price_range: Optional[str] = None
    hours: Optional[str] = None
    phone: Optional[str] = None

class Food(BaseModel):
    id: str
    name: str
    description: str
    price: float
    image_url: Optional[str] = None
    restaurant_id: str
    category: Optional[str] = None
    ingredients: Optional[List[str]] = None

class AuthResponse(BaseModel):
    success: bool
    user: User

class FirebaseTokenRequest(BaseModel):
    firebase_token: str

# Helper functions
async def verify_firebase_token_simple(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """Simplified Firebase token verification using Firebase REST API"""
    try:
        # Extract token from Authorization header
        token = credentials.credentials
        
        # For now, we'll create a mock verification
        # In production, you would verify with Firebase REST API or Admin SDK
        # This is a placeholder that creates a user based on token
        
        # Mock user data (replace with actual Firebase verification)
        firebase_uid = "mock_firebase_uid_" + token[-10:]  # Use last 10 chars of token as mock UID
        email = "user@example.com"  # Mock email
        name = "Usuario Demo"  # Mock name
        
        # Check if user exists in Supabase, create if not
        user = await supabase_service.get_user_by_firebase_uid(firebase_uid)
        
        if not user:
            # Create new user in Supabase
            user_data = {
                'name': name,
                'email': email,
                'firebase_uid': firebase_uid,
                'profile_image': None
            }
            user = await supabase_service.create_user(user_data)
            
            if not user:
                raise HTTPException(status_code=500, detail="Error creating user")
        
        return user
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Auth error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")

# Auth endpoints
@app.post("/api/auth/verify", response_model=AuthResponse)
async def verify_token(current_user: dict = Depends(verify_firebase_token_simple)):
    """Verify Firebase token and return user data"""
    user = User(
        id=current_user["id"],
        name=current_user["name"],
        email=current_user["email"],
        profile_image=current_user.get("profile_image"),
        firebase_uid=current_user["firebase_uid"]
    )
    
    return AuthResponse(success=True, user=user)

@app.post("/api/auth/login", response_model=AuthResponse)
async def login_with_firebase(request: FirebaseTokenRequest):
    """Login with Firebase token (simplified version)"""
    try:
        # Mock Firebase token verification for now
        firebase_uid = "mock_firebase_uid_" + request.firebase_token[-10:]
        
        # Get or create user
        user = await supabase_service.get_user_by_firebase_uid(firebase_uid)
        
        if not user:
            # Create mock user
            user_data = {
                'name': 'Usuario Demo',
                'email': 'demo@antojosgo.com',
                'firebase_uid': firebase_uid,
                'profile_image': None
            }
            user = await supabase_service.create_user(user_data)
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_response = User(
            id=user["id"],
            name=user["name"],
            email=user["email"],
            profile_image=user.get("profile_image"),
            firebase_uid=user["firebase_uid"]
        )
        
        return AuthResponse(success=True, user=user_response)
    
    except Exception as e:
        print(f"Login error: {e}")
        raise HTTPException(status_code=400, detail="Login failed")

# Restaurant endpoints
@app.get("/api/restaurants", response_model=List[Restaurant])
async def get_restaurants(
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    category: Optional[str] = None,
    radius: Optional[float] = None
):
    """Get all restaurants from Supabase"""
    try:
        if category and category != "all":
            restaurants = await supabase_service.get_restaurants_by_category(category)
        else:
            restaurants = await supabase_service.get_all_restaurants()
        
        # If no restaurants in Supabase, return mock data for testing
        if not restaurants:
            return get_mock_restaurants()
        
        return [Restaurant(**restaurant) for restaurant in restaurants]
    except Exception as e:
        print(f"Error getting restaurants: {e}")
        return get_mock_restaurants()

def get_mock_restaurants():
    """Return mock restaurants for testing when Supabase tables don't exist yet"""
    return [
        Restaurant(
            id="1",
            name="Tacos El Güero",
            description="Los mejores tacos de la ciudad con recetas tradicionales mexicanas",
            category="mexican",
            address="Av. Revolución 123, Centro",
            coordinates={"latitude": 19.432608, "longitude": -99.133209},
            image_url="https://res.cloudinary.com/antojosgo/image/upload/v1/restaurants/tacos_sample.jpg",
            rating=4.5,
            price_range="$$",
            hours="10:00 AM - 10:00 PM",
            phone="+52 55 1234 5678"
        ),
        Restaurant(
            id="2",
            name="Pizza Italiana",
            description="Auténtica pizza italiana con ingredientes frescos importados",
            category="italian",
            address="Calle Roma 456, Roma Norte",
            coordinates={"latitude": 19.418851, "longitude": -99.166890},
            image_url="https://res.cloudinary.com/antojosgo/image/upload/v1/restaurants/pizza_sample.jpg",
            rating=4.2,
            price_range="$$$",
            hours="12:00 PM - 11:00 PM",
            phone="+52 55 2345 6789"
        ),
        Restaurant(
            id="3",
            name="Burger House",
            description="Las mejores hamburguesas gourmet de la ciudad",
            category="fast-food",
            address="Insurgentes Sur 789, Del Valle",
            coordinates={"latitude": 19.371422, "longitude": -99.164999},
            image_url="https://res.cloudinary.com/antojosgo/image/upload/v1/restaurants/burger_sample.jpg",
            rating=4.0,
            price_range="$$",
            hours="11:00 AM - 12:00 AM",
            phone="+52 55 3456 7890"
        )
    ]

@app.get("/api/restaurants/{restaurant_id}", response_model=Restaurant)
async def get_restaurant_by_id(restaurant_id: str):
    """Get restaurant by ID from Supabase"""
    try:
        restaurant = await supabase_service.get_restaurant_by_id(restaurant_id)
        if not restaurant:
            # Return mock restaurant if not found in Supabase
            mock_restaurants = get_mock_restaurants()
            mock_restaurant = next((r for r in mock_restaurants if r.id == restaurant_id), None)
            if mock_restaurant:
                return mock_restaurant
            raise HTTPException(status_code=404, detail="Restaurant not found")
        
        return Restaurant(**restaurant)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting restaurant: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/restaurants/search", response_model=List[Restaurant])
async def search_restaurants(q: str):
    """Search restaurants by name"""
    try:
        restaurants = await supabase_service.search_restaurants(q)
        
        # If no results from Supabase, search mock data
        if not restaurants:
            mock_restaurants = get_mock_restaurants()
            return [r for r in mock_restaurants if q.lower() in r.name.lower() or q.lower() in r.description.lower()]
        
        return [Restaurant(**restaurant) for restaurant in restaurants]
    except Exception as e:
        print(f"Error searching restaurants: {e}")
        return []

# Food endpoints
@app.get("/api/restaurants/{restaurant_id}/foods", response_model=List[Food])
async def get_restaurant_foods(restaurant_id: str):
    """Get foods for a specific restaurant"""
    try:
        foods = await supabase_service.get_foods_by_restaurant(restaurant_id)
        
        # If no foods in Supabase, return mock data
        if not foods:
            return get_mock_foods(restaurant_id)
        
        return [Food(**food) for food in foods]
    except Exception as e:
        print(f"Error getting restaurant foods: {e}")
        return get_mock_foods(restaurant_id)

def get_mock_foods(restaurant_id: str):
    """Return mock foods for testing"""
    mock_foods = {
        "1": [  # Tacos El Güero
            Food(
                id="1",
                name="Taco de Carnitas",
                description="Deliciosos tacos de carnitas con cebolla y cilantro",
                price=15.0,
                restaurant_id="1",
                category="Tacos",
                ingredients=["carnitas", "cebolla", "cilantro", "tortilla"]
            ),
            Food(
                id="2",
                name="Taco de Pastor",
                description="Tacos al pastor con piña y salsa verde",
                price=18.0,
                restaurant_id="1",
                category="Tacos",
                ingredients=["pastor", "piña", "cebolla", "cilantro", "tortilla"]
            )
        ],
        "2": [  # Pizza Italiana
            Food(
                id="3",
                name="Pizza Margherita",
                description="Pizza clásica con tomate, mozzarella y albahaca",
                price=220.0,
                restaurant_id="2",
                category="Pizzas",
                ingredients=["masa", "tomate", "mozzarella", "albahaca"]
            )
        ],
        "3": [  # Burger House
            Food(
                id="4",
                name="Burger Clásica",
                description="Hamburguesa con carne, lechuga, tomate y cebolla",
                price=85.0,
                restaurant_id="3",
                category="Hamburguesas",
                ingredients=["carne", "pan", "lechuga", "tomate", "cebolla"]
            )
        ]
    }
    
    return mock_foods.get(restaurant_id, [])

@app.get("/api/foods/{food_id}", response_model=Food)
async def get_food_by_id(food_id: str):
    """Get food by ID"""
    try:
        food = await supabase_service.get_food_by_id(food_id)
        if not food:
            raise HTTPException(status_code=404, detail="Food not found")
        
        return Food(**food)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting food: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/foods/search", response_model=List[Food])
async def search_foods(q: str):
    """Search foods by name"""
    try:
        foods = await supabase_service.search_foods(q)
        return [Food(**food) for food in foods]
    except Exception as e:
        print(f"Error searching foods: {e}")
        return []

# User profile endpoints
@app.put("/api/profile")
async def update_profile(
    profile_data: dict,
    current_user: dict = Depends(verify_firebase_token_simple)
):
    """Update user profile"""
    try:
        updated_user = await supabase_service.update_user(current_user["id"], profile_data)
        
        if not updated_user:
            raise HTTPException(status_code=500, detail="Failed to update profile")
        
        return User(
            id=updated_user["id"],
            name=updated_user["name"],
            email=updated_user["email"],
            profile_image=updated_user.get("profile_image"),
            firebase_uid=updated_user["firebase_uid"]
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating profile: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Health check
@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "OK",
        "message": "AntojosGo API v2.0 is running",
        "features": ["Firebase Auth (Simplified)", "Supabase Database", "Cloudinary Images", "Mapbox Maps"],
        "note": "Using mock data until Supabase tables are created"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)