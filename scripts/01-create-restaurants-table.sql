-- Create restaurants table for AntojosGo
CREATE TABLE IF NOT EXISTS restaurants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  cuisine_type VARCHAR(100),
  address TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  phone VARCHAR(20),
  website VARCHAR(255),
  price_range INTEGER CHECK (price_range >= 1 AND price_range <= 4), -- 1-4 dollar signs
  rating DECIMAL(3, 2) DEFAULT 0.0,
  total_reviews INTEGER DEFAULT 0,
  image_url TEXT,
  opening_hours JSONB,
  features TEXT[], -- array of features like "outdoor seating", "delivery", etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for location-based searches
CREATE INDEX IF NOT EXISTS idx_restaurants_location ON restaurants USING GIST (
  ll_to_earth(latitude, longitude)
);

-- Create index for text searches
CREATE INDEX IF NOT EXISTS idx_restaurants_search ON restaurants USING GIN (
  to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || COALESCE(cuisine_type, ''))
);

-- Create index for cuisine type
CREATE INDEX IF NOT EXISTS idx_restaurants_cuisine ON restaurants (cuisine_type);

-- Create index for rating
CREATE INDEX IF NOT EXISTS idx_restaurants_rating ON restaurants (rating DESC);
