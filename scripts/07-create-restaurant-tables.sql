-- Creating comprehensive restaurant management database schema

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Create restaurants table
CREATE TABLE IF NOT EXISTS restaurants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    phone VARCHAR(20),
    website VARCHAR(255),
    logo_url TEXT,
    social_media JSONB DEFAULT '{}',
    opening_hours JSONB DEFAULT '{}',
    price_range VARCHAR(10) CHECK (price_range IN ('$', '$$', '$$$', '$$$$')),
    service_options JSONB DEFAULT '[]', -- ["dine_in", "takeout", "delivery"]
    legal_info JSONB DEFAULT '{}', -- NIT, legal documents
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    rating DECIMAL(3,2) DEFAULT 0.0,
    review_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create restaurant_categories junction table
CREATE TABLE IF NOT EXISTS restaurant_categories (
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (restaurant_id, category_id)
);

-- Create dishes table
CREATE TABLE IF NOT EXISTS dishes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    ingredients TEXT[],
    category VARCHAR(100),
    price DECIMAL(10,2) NOT NULL,
    image_url TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    is_special BOOLEAN DEFAULT FALSE, -- for daily specials
    allergens TEXT[],
    dietary_info TEXT[], -- ["vegetarian", "vegan", "gluten_free", etc.]
    preparation_time INTEGER, -- in minutes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create restaurant_images table
CREATE TABLE IF NOT EXISTS restaurant_images (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    type VARCHAR(50) CHECK (type IN ('logo', 'cover', 'interior', 'food', 'menu')),
    caption TEXT,
    is_primary BOOLEAN DEFAULT FALSE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create restaurant_reviews table (extending reviews functionality)
CREATE TABLE IF NOT EXISTS restaurant_reviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    user_name VARCHAR(255) NOT NULL,
    user_email VARCHAR(255),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    response TEXT, -- restaurant owner response
    response_date TIMESTAMP WITH TIME ZONE,
    is_verified BOOLEAN DEFAULT FALSE,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create restaurant_metrics table for analytics
CREATE TABLE IF NOT EXISTS restaurant_metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    profile_views INTEGER DEFAULT 0,
    recommendation_count INTEGER DEFAULT 0,
    search_appearances INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(restaurant_id, date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_restaurants_location ON restaurants USING GIST (ST_Point(longitude, latitude));
CREATE INDEX IF NOT EXISTS idx_restaurants_rating ON restaurants(rating DESC);
CREATE INDEX IF NOT EXISTS idx_restaurants_active ON restaurants(is_active);
CREATE INDEX IF NOT EXISTS idx_dishes_restaurant ON dishes(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_dishes_available ON dishes(is_available);
CREATE INDEX IF NOT EXISTS idx_restaurant_reviews_restaurant ON restaurant_reviews(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_reviews_rating ON restaurant_reviews(rating);

-- Create triggers for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON restaurants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dishes_updated_at BEFORE UPDATE ON dishes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_restaurant_reviews_updated_at BEFORE UPDATE ON restaurant_reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update restaurant rating when reviews change
CREATE OR REPLACE FUNCTION update_restaurant_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE restaurants 
    SET 
        rating = (
            SELECT COALESCE(AVG(rating), 0)
            FROM restaurant_reviews 
            WHERE restaurant_id = COALESCE(NEW.restaurant_id, OLD.restaurant_id)
        ),
        review_count = (
            SELECT COUNT(*)
            FROM restaurant_reviews 
            WHERE restaurant_id = COALESCE(NEW.restaurant_id, OLD.restaurant_id)
        )
    WHERE id = COALESCE(NEW.restaurant_id, OLD.restaurant_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

CREATE TRIGGER update_restaurant_rating_trigger
    AFTER INSERT OR UPDATE OR DELETE ON restaurant_reviews
    FOR EACH ROW EXECUTE FUNCTION update_restaurant_rating();
