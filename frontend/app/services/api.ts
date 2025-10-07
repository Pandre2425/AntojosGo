//frontend/app/services/api.ts
import Constants from 'expo-constants';
import axios from "axios";
import { loginAndGetIdToken } from "./auth";

interface LoginResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    profileImage?: string;
  };
}

interface Restaurant {
  id: string;
  name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  cuisineType: string;
  rating: number;
  priceRange: string;
  hours: string;
  phone: string;
  images: string[];
  menu: MenuItem[];
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  ingredients: string[];
  category: string;
}

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8800';

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/api`;
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      return await response.json();
    } catch (error) {
      console.error('API login error:', error);
      throw error;
    }
  }

  async register(name: string, email: string, password: string): Promise<LoginResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });
      
      return await response.json();
    } catch (error) {
      console.error('API register error:', error);
      throw error;
    }
  }

  async googleAuth(googleToken: string): Promise<LoginResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: googleToken }),
      });
      
      return await response.json();
    } catch (error) {
      console.error('API Google auth error:', error);
      throw error;
    }
  }

  async verifyToken(token: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      return await response.json();
    } catch (error) {
      console.error('API verify token error:', error);
      throw error;
    }
  }

  async getRestaurants(filters?: {
    latitude?: number;
    longitude?: number;
    cuisineType?: string;
    radius?: number;
  }): Promise<Restaurant[]> {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value) params.append(key, value.toString());
        });
      }
      
      const response = await fetch(`${this.baseUrl}/restaurants?${params}`);
      return await response.json();
    } catch (error) {
      console.error('API get restaurants error:', error);
      throw error;
    }
  }

  async getRestaurantById(id: string): Promise<Restaurant> {
    try {
      const response = await fetch(`${this.baseUrl}/restaurants/${id}`);
      return await response.json();
    } catch (error) {
      console.error('API get restaurant by ID error:', error);
      throw error;
    }
  }

  async updateProfile(userData: any, token: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(userData),
      });
      
      return await response.json();
    } catch (error) {
      console.error('API update profile error:', error);
      throw error;
    }
  }

  async searchRestaurants(query: string): Promise<Restaurant[]> {
    try {
      const response = await fetch(`${this.baseUrl}/restaurants/search?q=${encodeURIComponent(query)}`);
      return await response.json();
    } catch (error) {
      console.error('API search restaurants error:', error);
      throw error;
    }
  }

  async getAIRecommendations(query: string, latitude?: number, longitude?: number, preferences?: any): Promise<{
    success: boolean;
    query: string;
    interpretation: any;
    results: Restaurant[];
    count: number;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/ai/recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          latitude,
          longitude,
          preferences,
        }),
      });
      
      return await response.json();
    } catch (error) {
      console.error('API AI recommendations error:', error);
      throw error;
    }
  }

  async uploadImage(imageUri: string, token: string, folder?: string): Promise<{
    success: boolean;
    url?: string;
    provider?: string;
  }> {
    try {
      const formData = new FormData();
      
      // Convert image URI to blob for upload
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      formData.append('image', blob as any, 'image.jpg');
      if (folder) {
        formData.append('folder', folder);
      }

      const uploadResponse = await fetch(`${this.baseUrl}/upload/image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      
      return await uploadResponse.json();
    } catch (error) {
      console.error('API upload image error:', error);
      throw error;
    }
  }
}

export const apiService = new ApiService();
export type { Restaurant, MenuItem, LoginResponse };