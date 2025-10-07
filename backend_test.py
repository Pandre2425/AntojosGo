#!/usr/bin/env python3
"""
AntojosGo Backend API Test Suite
Tests all backend endpoints for functionality and proper responses
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

# Use the frontend environment URL for testing
BASE_URL = "http://localhost:8001/api"

class AntojosGoAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.auth_token = None
        self.test_user_data = {
            "name": "Maria Rodriguez",
            "email": "maria.rodriguez@example.com", 
            "password": "securepass123"
        }
        self.results = []
        
    def log_result(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        if response_data and not success:
            print(f"   Response: {response_data}")
        print()
        
        self.results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "response": response_data
        })
    
    def test_health_endpoint(self):
        """Test /api/health endpoint"""
        try:
            response = requests.get(f"{self.base_url}/health", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "OK" and "message" in data:
                    self.log_result("Health Check", True, f"Status: {data['status']}, Message: {data['message']}")
                else:
                    self.log_result("Health Check", False, f"Unexpected response format", data)
            else:
                self.log_result("Health Check", False, f"Status code: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Health Check", False, f"Request failed: {str(e)}")
    
    def test_user_registration(self):
        """Test /api/auth/register endpoint"""
        try:
            response = requests.post(
                f"{self.base_url}/auth/register",
                json=self.test_user_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if (data.get("success") and "token" in data and "user" in data):
                    user = data["user"]
                    if (user.get("name") == self.test_user_data["name"] and 
                        user.get("email") == self.test_user_data["email"] and
                        "id" in user):
                        self.auth_token = data["token"]
                        self.log_result("User Registration", True, f"User created with ID: {user['id']}")
                    else:
                        self.log_result("User Registration", False, "Invalid user data in response", data)
                else:
                    self.log_result("User Registration", False, "Missing required fields in response", data)
            else:
                self.log_result("User Registration", False, f"Status code: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("User Registration", False, f"Request failed: {str(e)}")
    
    def test_user_login(self):
        """Test /api/auth/login endpoint"""
        try:
            login_data = {
                "email": self.test_user_data["email"],
                "password": self.test_user_data["password"]
            }
            
            response = requests.post(
                f"{self.base_url}/auth/login",
                json=login_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if (data.get("success") and "token" in data and "user" in data):
                    user = data["user"]
                    if user.get("email") == self.test_user_data["email"]:
                        self.auth_token = data["token"]
                        self.log_result("User Login", True, f"Login successful for user: {user['name']}")
                    else:
                        self.log_result("User Login", False, "Email mismatch in response", data)
                else:
                    self.log_result("User Login", False, "Missing required fields in response", data)
            else:
                self.log_result("User Login", False, f"Status code: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("User Login", False, f"Request failed: {str(e)}")
    
    def test_google_auth(self):
        """Test /api/auth/google endpoint (mocked)"""
        try:
            google_data = {"token": "mock_google_token_12345"}
            
            response = requests.post(
                f"{self.base_url}/auth/google",
                json=google_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if (data.get("success") and "token" in data and "user" in data):
                    user = data["user"]
                    if user.get("name") == "Usuario Google" and user.get("email") == "usuario@google.com":
                        self.log_result("Google OAuth", True, f"Google auth successful for user: {user['name']}")
                    else:
                        self.log_result("Google OAuth", False, "Unexpected user data", data)
                else:
                    self.log_result("Google OAuth", False, "Missing required fields in response", data)
            else:
                self.log_result("Google OAuth", False, f"Status code: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Google OAuth", False, f"Request failed: {str(e)}")
    
    def test_token_verification(self):
        """Test /api/auth/verify endpoint"""
        if not self.auth_token:
            self.log_result("Token Verification", False, "No auth token available")
            return
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            response = requests.get(
                f"{self.base_url}/auth/verify",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if ("id" in data and "name" in data and "email" in data):
                    self.log_result("Token Verification", True, f"Token verified for user: {data['name']}")
                else:
                    self.log_result("Token Verification", False, "Invalid user data in response", data)
            else:
                self.log_result("Token Verification", False, f"Status code: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Token Verification", False, f"Request failed: {str(e)}")
    
    def test_token_verification_without_auth(self):
        """Test /api/auth/verify endpoint without authorization header"""
        try:
            response = requests.get(f"{self.base_url}/auth/verify", timeout=10)
            
            if response.status_code == 403:
                self.log_result("Token Verification (No Auth)", True, "Correctly rejected request without auth header")
            else:
                self.log_result("Token Verification (No Auth)", False, f"Expected 403, got {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Token Verification (No Auth)", False, f"Request failed: {str(e)}")
    
    def test_get_all_restaurants(self):
        """Test /api/restaurants endpoint"""
        try:
            response = requests.get(f"{self.base_url}/restaurants", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) == 3:
                    # Verify expected restaurants
                    restaurant_names = [r["name"] for r in data]
                    expected_names = ["Tacos El Güero", "Pizza Italiana", "Burger House"]
                    
                    if all(name in restaurant_names for name in expected_names):
                        self.log_result("Get All Restaurants", True, f"Retrieved {len(data)} restaurants")
                    else:
                        self.log_result("Get All Restaurants", False, f"Missing expected restaurants", restaurant_names)
                else:
                    self.log_result("Get All Restaurants", False, f"Expected 3 restaurants, got {len(data) if isinstance(data, list) else 'non-list'}", data)
            else:
                self.log_result("Get All Restaurants", False, f"Status code: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Get All Restaurants", False, f"Request failed: {str(e)}")
    
    def test_filter_restaurants_by_cuisine(self):
        """Test /api/restaurants endpoint with cuisine filter"""
        try:
            response = requests.get(f"{self.base_url}/restaurants?cuisineType=mexican", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) == 1:
                    restaurant = data[0]
                    if restaurant["name"] == "Tacos El Güero" and restaurant["cuisineType"] == "mexican":
                        self.log_result("Filter Restaurants (Mexican)", True, f"Found 1 Mexican restaurant: {restaurant['name']}")
                    else:
                        self.log_result("Filter Restaurants (Mexican)", False, "Wrong restaurant returned", restaurant)
                else:
                    self.log_result("Filter Restaurants (Mexican)", False, f"Expected 1 restaurant, got {len(data) if isinstance(data, list) else 'non-list'}", data)
            else:
                self.log_result("Filter Restaurants (Mexican)", False, f"Status code: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Filter Restaurants (Mexican)", False, f"Request failed: {str(e)}")
    
    def test_get_restaurant_by_id(self):
        """Test /api/restaurants/{id} endpoint"""
        try:
            response = requests.get(f"{self.base_url}/restaurants/1", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if (data.get("id") == "1" and data.get("name") == "Tacos El Güero" and 
                    "menu" in data and isinstance(data["menu"], list)):
                    menu_items = len(data["menu"])
                    self.log_result("Get Restaurant by ID", True, f"Retrieved restaurant with {menu_items} menu items")
                else:
                    self.log_result("Get Restaurant by ID", False, "Invalid restaurant data", data)
            else:
                self.log_result("Get Restaurant by ID", False, f"Status code: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Get Restaurant by ID", False, f"Request failed: {str(e)}")
    
    def test_get_nonexistent_restaurant(self):
        """Test /api/restaurants/{id} endpoint with invalid ID"""
        try:
            response = requests.get(f"{self.base_url}/restaurants/999", timeout=10)
            
            if response.status_code == 404:
                self.log_result("Get Nonexistent Restaurant", True, "Correctly returned 404 for invalid restaurant ID")
            else:
                self.log_result("Get Nonexistent Restaurant", False, f"Expected 404, got {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Get Nonexistent Restaurant", False, f"Request failed: {str(e)}")
    
    def test_search_restaurants(self):
        """Test /api/restaurants/search endpoint"""
        try:
            response = requests.get(f"{self.base_url}/restaurants/search?q=pizza", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) == 1:
                    restaurant = data[0]
                    if restaurant["name"] == "Pizza Italiana":
                        self.log_result("Search Restaurants", True, f"Found 1 restaurant matching 'pizza': {restaurant['name']}")
                    else:
                        self.log_result("Search Restaurants", False, "Wrong restaurant returned", restaurant)
                else:
                    self.log_result("Search Restaurants", False, f"Expected 1 restaurant, got {len(data) if isinstance(data, list) else 'non-list'}", data)
            else:
                self.log_result("Search Restaurants", False, f"Status code: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Search Restaurants", False, f"Request failed: {str(e)}")
    
    def test_search_restaurants_no_results(self):
        """Test /api/restaurants/search endpoint with no matches"""
        try:
            response = requests.get(f"{self.base_url}/restaurants/search?q=sushi", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) == 0:
                    self.log_result("Search Restaurants (No Results)", True, "Correctly returned empty list for 'sushi'")
                else:
                    self.log_result("Search Restaurants (No Results)", False, f"Expected empty list, got {len(data) if isinstance(data, list) else 'non-list'}", data)
            else:
                self.log_result("Search Restaurants (No Results)", False, f"Status code: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Search Restaurants (No Results)", False, f"Request failed: {str(e)}")
    
    def test_update_profile(self):
        """Test /api/profile endpoint (requires authentication)"""
        if not self.auth_token:
            self.log_result("Update Profile", False, "No auth token available")
            return
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            profile_data = {
                "name": "Maria Rodriguez Updated",
                "profileImage": "https://example.com/avatar.jpg"
            }
            
            response = requests.put(
                f"{self.base_url}/profile",
                json=profile_data,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if (data.get("name") == profile_data["name"] and 
                    data.get("profileImage") == profile_data["profileImage"]):
                    self.log_result("Update Profile", True, f"Profile updated successfully: {data['name']}")
                else:
                    self.log_result("Update Profile", False, "Profile data not updated correctly", data)
            else:
                self.log_result("Update Profile", False, f"Status code: {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Update Profile", False, f"Request failed: {str(e)}")
    
    def test_update_profile_without_auth(self):
        """Test /api/profile endpoint without authentication"""
        try:
            profile_data = {"name": "Unauthorized User"}
            
            response = requests.put(
                f"{self.base_url}/profile",
                json=profile_data,
                timeout=10
            )
            
            if response.status_code == 403:
                self.log_result("Update Profile (No Auth)", True, "Correctly rejected request without auth header")
            else:
                self.log_result("Update Profile (No Auth)", False, f"Expected 403, got {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Update Profile (No Auth)", False, f"Request failed: {str(e)}")
    
    def test_cors_headers(self):
        """Test CORS headers are present"""
        try:
            response = requests.options(f"{self.base_url}/health", timeout=10)
            
            cors_headers = [
                "Access-Control-Allow-Origin",
                "Access-Control-Allow-Methods", 
                "Access-Control-Allow-Headers"
            ]
            
            present_headers = [h for h in cors_headers if h in response.headers]
            
            if len(present_headers) >= 1:  # At least some CORS headers present
                self.log_result("CORS Headers", True, f"CORS headers present: {present_headers}")
            else:
                self.log_result("CORS Headers", False, f"No CORS headers found", dict(response.headers))
                
        except Exception as e:
            self.log_result("CORS Headers", False, f"Request failed: {str(e)}")
    
    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting AntojosGo API Tests")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        # Basic functionality tests
        self.test_health_endpoint()
        
        # Authentication flow tests
        self.test_user_registration()
        self.test_user_login()
        self.test_google_auth()
        self.test_token_verification()
        self.test_token_verification_without_auth()
        
        # Restaurant endpoints tests
        self.test_get_all_restaurants()
        self.test_filter_restaurants_by_cuisine()
        self.test_get_restaurant_by_id()
        self.test_get_nonexistent_restaurant()
        self.test_search_restaurants()
        self.test_search_restaurants_no_results()
        
        # Protected endpoints tests
        self.test_update_profile()
        self.test_update_profile_without_auth()
        
        # Infrastructure tests
        self.test_cors_headers()
        
        # Summary
        print("=" * 60)
        passed = sum(1 for r in self.results if r["success"])
        total = len(self.results)
        print(f"📊 Test Results: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed!")
        else:
            print("⚠️  Some tests failed. Check details above.")
            failed_tests = [r["test"] for r in self.results if not r["success"]]
            print(f"Failed tests: {', '.join(failed_tests)}")
        
        return passed == total

if __name__ == "__main__":
    tester = AntojosGoAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)