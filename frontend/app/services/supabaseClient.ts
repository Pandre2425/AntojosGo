import { createClient } from "@supabase/supabase-js";

const supabaseUrl = 'https://dmskwpquomqcsumaqaej.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtc2t3cHF1b21xY3N1bWFxYWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg5Mzk0NDMsImV4cCI6MjA1NDUxNTQ0M30.A6aMcEqnl2V7l4vlwG9dUtK7F4BBIT3K4Lz7L-rHTd4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database service interfaces
export interface User {
  id: string;
  name: string;
  email: string;
  profile_image?: string;
  firebase_uid: string;
  created_at?: string;
  updated_at?: string;
}

export interface Restaurant {
  id: string;
  name: string;
  description: string;
  category: string;
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  image_url?: string;
  rating?: number;
  price_range?: string;
  hours?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Food {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url?: string;
  restaurant_id: string;
  category?: string;
  ingredients?: string[];
  created_at?: string;
  updated_at?: string;
}

// User service methods
export const userService = {
  async createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating user:', error);
      return null;
    }
    return data;
  },

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('firebase_uid', firebaseUid)
      .single();
    
    if (error) {
      console.error('Error getting user:', error);
      return null;
    }
    return data;
  },

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating user:', error);
      return null;
    }
    return data;
  }
};

// Restaurant service methods
export const restaurantService = {
  async getAllRestaurants(): Promise<Restaurant[]> {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error getting restaurants:', error);
      return [];
    }
    return data || [];
  },

  async getRestaurantById(id: string): Promise<Restaurant | null> {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error getting restaurant:', error);
      return null;
    }
    return data;
  },

  async searchRestaurants(query: string): Promise<Restaurant[]> {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('name');
    
    if (error) {
      console.error('Error searching restaurants:', error);
      return [];
    }
    return data || [];
  },

  async getRestaurantsByCategory(category: string): Promise<Restaurant[]> {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('category', category)
      .order('name');
    
    if (error) {
      console.error('Error getting restaurants by category:', error);
      return [];
    }
    return data || [];
  }
};

// Food service methods
export const foodService = {
  async getFoodsByRestaurant(restaurantId: string): Promise<Food[]> {
    const { data, error } = await supabase
      .from('foods')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('name');
    
    if (error) {
      console.error('Error getting foods:', error);
      return [];
    }
    return data || [];
  },

  async getFoodById(id: string): Promise<Food | null> {
    const { data, error } = await supabase
      .from('foods')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error getting food:', error);
      return null;
    }
    return data;
  },

  async searchFoods(query: string): Promise<Food[]> {
    const { data, error } = await supabase
      .from('foods')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('name');
    
    if (error) {
      console.error('Error searching foods:', error);
      return [];
    }
    return data || [];
  }
};