#!/usr/bin/env python3
"""
Simple AntojosGo Backend API Test
Tests the actual backend endpoints as implemented
"""

import requests
import json

# Backend URL
BASE_URL = "http://localhost:8001/api"

def test_health():
    """Test health endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=10)
        print(f"Health Check: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"  Response: {data}")
            return True
        return False
    except Exception as e:
        print(f"Health Check Failed: {e}")
        return False

def test_registration():
    """Test user registration"""
    user_data = {
        "name": "Carlos Rodriguez",
        "email": "carlos.test@antojosgo.com",
        "password": "SecurePass123!"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json=user_data, timeout=10)
        print(f"Registration: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"  Success: {data.get('success')}")
            print(f"  User: {data.get('user', {}).get('name')}")
            return data.get('token')
        else:
            print(f"  Error: {response.text}")
        return None
    except Exception as e:
        print(f"Registration Failed: {e}")
        return None

def test_login():
    """Test user login"""
    login_data = {
        "email": "carlos.test@antojosgo.com",
        "password": "SecurePass123!"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data, timeout=10)
        print(f"Login: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"  Success: {data.get('success')}")
            print(f"  User: {data.get('user', {}).get('name')}")
            return data.get('token')
        else:
            print(f"  Error: {response.text}")
        return None
    except Exception as e:
        print(f"Login Failed: {e}")
        return None

def test_restaurants():
    """Test restaurants endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/restaurants", timeout=10)
        print(f"Restaurants: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"  Found {len(data)} restaurants")
            if data:
                print(f"  First restaurant: {data[0].get('name')}")
            return True
        else:
            print(f"  Error: {response.text}")
        return False
    except Exception as e:
        print(f"Restaurants Failed: {e}")
        return False

def test_restaurant_detail():
    """Test restaurant detail endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/restaurants/1", timeout=10)
        print(f"Restaurant Detail: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"  Restaurant: {data.get('name')}")
            return True
        else:
            print(f"  Error: {response.text}")
        return False
    except Exception as e:
        print(f"Restaurant Detail Failed: {e}")
        return False

def test_search():
    """Test restaurant search"""
    try:
        response = requests.get(f"{BASE_URL}/restaurants/search?q=mexican", timeout=10)
        print(f"Search: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"  Found {len(data)} results for 'mexican'")
            return True
        else:
            print(f"  Error: {response.text}")
        return False
    except Exception as e:
        print(f"Search Failed: {e}")
        return False

def main():
    print("🚀 Testing AntojosGo Backend API")
    print(f"📍 API Base: {BASE_URL}")
    print("=" * 50)
    
    results = []
    
    # Test health
    results.append(("Health Check", test_health()))
    
    # Test registration
    token = test_registration()
    results.append(("Registration", token is not None))
    
    # Test login
    login_token = test_login()
    results.append(("Login", login_token is not None))
    
    # Test restaurants
    results.append(("Restaurants", test_restaurants()))
    
    # Test restaurant detail
    results.append(("Restaurant Detail", test_restaurant_detail()))
    
    # Test search
    results.append(("Search", test_search()))
    
    print("\n" + "=" * 50)
    print("📊 Test Results:")
    
    passed = 0
    for test_name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if success:
            passed += 1
    
    print(f"\n🎯 {passed}/{len(results)} tests passed")
    
    if passed == len(results):
        print("🎉 All tests passed!")
        return True
    else:
        print("⚠️  Some tests failed")
        return False

if __name__ == "__main__":
    main()