import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!;

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase configuration');
}


export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Database interfaces
export interface User {
  id: string;
  name: string;
  email: string;
  password_hash?: string;
  profile_image?: string;
  firebase_uid?: string;
  preferences?: any;
  location?: {
    latitude: number;
    longitude: number;
  };
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
  google_place_id?: string;
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