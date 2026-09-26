-- Create reviews table for AntojosGo
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id UUID, -- Will be null for anonymous reviews
  user_name VARCHAR(100) NOT NULL, -- Display name for the review
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(200),
  comment TEXT,
  visit_date DATE,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_reviews_restaurant ON reviews (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews (rating DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_created ON reviews (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_helpful ON reviews (helpful_count DESC);

-- Create function to update restaurant ratings
CREATE OR REPLACE FUNCTION update_restaurant_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the restaurant's average rating and review count
  UPDATE restaurants 
  SET 
    rating = (
      SELECT ROUND(AVG(rating)::numeric, 1)
      FROM reviews 
      WHERE restaurant_id = COALESCE(NEW.restaurant_id, OLD.restaurant_id)
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM reviews 
      WHERE restaurant_id = COALESCE(NEW.restaurant_id, OLD.restaurant_id)
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.restaurant_id, OLD.restaurant_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update restaurant ratings
DROP TRIGGER IF EXISTS trigger_update_restaurant_rating_insert ON reviews;
CREATE TRIGGER trigger_update_restaurant_rating_insert
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_restaurant_rating();

DROP TRIGGER IF EXISTS trigger_update_restaurant_rating_update ON reviews;
CREATE TRIGGER trigger_update_restaurant_rating_update
  AFTER UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_restaurant_rating();

DROP TRIGGER IF EXISTS trigger_update_restaurant_rating_delete ON reviews;
CREATE TRIGGER trigger_update_restaurant_rating_delete
  AFTER DELETE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_restaurant_rating();
