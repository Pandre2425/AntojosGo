#!/usr/bin/env python3
"""
Comprehensive AntojosGo Backend API Test Suite
Tests all endpoints with edge cases and error scenarios
"""

import requests
import json

BASE_URL = "http://localhost:8001/api"

def test_duplicate_registration():
    """Test duplicate email registration should fail"""
    user_data = {
        "name": "Carlos Rodriguez",
        "email": "carlos.test@antojosgo.com",
        "password": "SecurePass123!"
    }
    
    try:
        # First registration should succeed
        response1 = requests.post(f"{BASE_URL}/auth/register", json=user_data, timeout=10)
        print(f"First Registration: {response1.status_code}")
        
        # Second registration with same email should fail
        response2 = requests.post(f"{BASE_URL}/auth/register", json=user_data, timeout=10)
        print(f"Duplicate Registration: {response2.status_code}")
        
        if response2.status_code == 400:
            data = response2.json()
            print(f"  Error: {data.get('detail')}")
            return True
        return False
    except Exception as e:
        print(f"Duplicate Registration Test Failed: {e}")
        return False

def test_invalid_login():
    """Test login with wrong credentials"""
    login_data = {
        "email": "carlos.test@antojosgo.com",
        "password": "WrongPassword123!"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data, timeout=10)
        print(f"Invalid Login: {response.status_code}")
        
        if response.status_code == 401:
            data = response.json()
            print(f"  Error: {data.get('detail')}")
            return True
        return False
    except Exception as e:
        print(f"Invalid Login Test Failed: {e}")
        return False

def test_token_verification():
    """Test token verification endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/auth/verify", timeout=10)
        print(f"Token Verification: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"  Success: {data.get('success')}")
            return True
        return False
    except Exception as e:
        print(f"Token Verification Test Failed: {e}")
        return False

def test_invalid_restaurant_id():
    """Test restaurant detail with invalid ID"""
    try:
        response = requests.get(f"{BASE_URL}/restaurants/999", timeout=10)
        print(f"Invalid Restaurant ID: {response.status_code}")
        
        if response.status_code == 404:
            data = response.json()
            print(f"  Error: {data.get('detail')}")
            return True
        return False
    except Exception as e:
        print(f"Invalid Restaurant ID Test Failed: {e}")
        return False

def test_search_no_results():
    """Test search with no matching results"""
    try:
        response = requests.get(f"{BASE_URL}/restaurants/search?q=nonexistent", timeout=10)
        print(f"Search No Results: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"  Results: {len(data)} restaurants found")
            return len(data) == 0
        return False
    except Exception as e:
        print(f"Search No Results Test Failed: {e}")
        return False

def test_search_case_insensitive():
    """Test search is case insensitive"""
    try:
        response = requests.get(f"{BASE_URL}/restaurants/search?q=MEXICAN", timeout=10)
        print(f"Search Case Insensitive: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"  Results: {len(data)} restaurants found for 'MEXICAN'")
            return len(data) > 0
        return False
    except Exception as e:
        print(f"Search Case Insensitive Test Failed: {e}")
        return False

def test_cors_headers():
    """Test CORS headers are present"""
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=10)
        print(f"CORS Headers Test: {response.status_code}")
        
        cors_headers = [
            "Access-Control-Allow-Origin",
            "Access-Control-Allow-Methods",
            "Access-Control-Allow-Headers"
        ]
        
        present_headers = [h for h in cors_headers if h in response.headers]
        print(f"  CORS Headers Present: {len(present_headers)}")
        
        return len(present_headers) > 0
    except Exception as e:
        print(f"CORS Headers Test Failed: {e}")
        return False

def test_restaurant_data_structure():
    """Test restaurant data has all required fields"""
    try:
        response = requests.get(f"{BASE_URL}/restaurants", timeout=10)
        print(f"Restaurant Data Structure: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if data:
                restaurant = data[0]
                required_fields = ["id", "name", "description", "address", "latitude", "longitude", "cuisineType", "rating", "priceRange"]
                missing_fields = [field for field in required_fields if field not in restaurant]
                
                print(f"  Required fields present: {len(required_fields) - len(missing_fields)}/{len(required_fields)}")
                if missing_fields:
                    print(f"  Missing fields: {missing_fields}")
                
                return len(missing_fields) == 0
        return False
    except Exception as e:
        print(f"Restaurant Data Structure Test Failed: {e}")
        return False

def main():
    print("🚀 Comprehensive AntojosGo Backend API Tests")
    print(f"📍 API Base: {BASE_URL}")
    print("=" * 60)
    
    tests = [
        ("Duplicate Registration Prevention", test_duplicate_registration),
        ("Invalid Login Prevention", test_invalid_login),
        ("Token Verification", test_token_verification),
        ("Invalid Restaurant ID", test_invalid_restaurant_id),
        ("Search No Results", test_search_no_results),
        ("Search Case Insensitive", test_search_case_insensitive),
        ("CORS Headers", test_cors_headers),
        ("Restaurant Data Structure", test_restaurant_data_structure),
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n🧪 Testing: {test_name}")
        success = test_func()
        results.append((test_name, success))
    
    print("\n" + "=" * 60)
    print("📊 Comprehensive Test Results:")
    
    passed = 0
    for test_name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if success:
            passed += 1
    
    print(f"\n🎯 {passed}/{len(results)} comprehensive tests passed")
    
    if passed == len(results):
        print("🎉 All comprehensive tests passed!")
        return True
    else:
        print("⚠️  Some comprehensive tests failed")
        return False

if __name__ == "__main__":
    main()