from supabase import create_client, Client
import os
from typing import Optional, List, Dict, Any

# Supabase configuration
SUPABASE_URL = "https://dmskwpquomqcsumaqaej.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtc2t3cHF1b21xY3N1bWFxYWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg5Mzk0NDMsImV4cCI6MjA1NDUxNTQ0M30.A6aMcEqnl2V7l4vlwG9dUtK7F4BBIT3K4Lz7L-rHTd4"

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

class SupabaseService:
    """Service class for Supabase operations"""
    
    def __init__(self):
        self.client = supabase
    
    # User operations
    async def create_user(self, user_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a new user in Supabase"""
        try:
            result = self.client.table('users').insert(user_data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"Error creating user: {e}")
            return None
    
    async def get_user_by_firebase_uid(self, firebase_uid: str) -> Optional[Dict[str, Any]]:
        """Get user by Firebase UID"""
        try:
            result = self.client.table('users').select('*').eq('firebase_uid', firebase_uid).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"Error getting user: {e}")
            return None
    
    async def update_user(self, user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update user data"""
        try:
            result = self.client.table('users').update(updates).eq('id', user_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"Error updating user: {e}")
            return None
    
    # Restaurant operations
    async def get_all_restaurants(self) -> List[Dict[str, Any]]:
        """Get all restaurants"""
        try:
            result = self.client.table('restaurants').select('*').order('name').execute()
            return result.data or []
        except Exception as e:
            print(f"Error getting restaurants: {e}")
            return []
    
    async def get_restaurant_by_id(self, restaurant_id: str) -> Optional[Dict[str, Any]]:
        """Get restaurant by ID"""
        try:
            result = self.client.table('restaurants').select('*').eq('id', restaurant_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"Error getting restaurant: {e}")
            return None
    
    async def search_restaurants(self, query: str) -> List[Dict[str, Any]]:
        """Search restaurants by name"""
        try:
            result = self.client.table('restaurants').select('*').ilike('name', f'%{query}%').execute()
            return result.data or []
        except Exception as e:
            print(f"Error searching restaurants: {e}")
            return []
    
    async def get_restaurants_by_category(self, category: str) -> List[Dict[str, Any]]:
        """Get restaurants by category"""
        try:
            result = self.client.table('restaurants').select('*').eq('category', category).execute()
            return result.data or []
        except Exception as e:
            print(f"Error getting restaurants by category: {e}")
            return []
    
    # Food operations
    async def get_foods_by_restaurant(self, restaurant_id: str) -> List[Dict[str, Any]]:
        """Get foods by restaurant ID"""
        try:
            result = self.client.table('foods').select('*').eq('restaurant_id', restaurant_id).execute()
            return result.data or []
        except Exception as e:
            print(f"Error getting foods: {e}")
            return []
    
    async def get_food_by_id(self, food_id: str) -> Optional[Dict[str, Any]]:
        """Get food by ID"""
        try:
            result = self.client.table('foods').select('*').eq('id', food_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"Error getting food: {e}")
            return None
    
    async def search_foods(self, query: str) -> List[Dict[str, Any]]:
        """Search foods by name"""
        try:
            result = self.client.table('foods').select('*').ilike('name', f'%{query}%').execute()
            return result.data or []
        except Exception as e:
            print(f"Error searching foods: {e}")
            return []

# Global instance
supabase_service = SupabaseService()