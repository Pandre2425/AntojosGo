-- Add advanced search and accessibility fields to restaurants table
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS dietary_options TEXT[] DEFAULT '{}';
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS allergens TEXT[] DEFAULT '{}';
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS accessibility_features TEXT[] DEFAULT '{}';
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS special_features TEXT[] DEFAULT '{}';
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS ingredients_keywords TEXT[] DEFAULT '{}';

-- Add indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_restaurants_dietary_options ON restaurants USING GIN (dietary_options);
CREATE INDEX IF NOT EXISTS idx_restaurants_allergens ON restaurants USING GIN (allergens);
CREATE INDEX IF NOT EXISTS idx_restaurants_accessibility ON restaurants USING GIN (accessibility_features);
CREATE INDEX IF NOT EXISTS idx_restaurants_special_features ON restaurants USING GIN (special_features);
CREATE INDEX IF NOT EXISTS idx_restaurants_ingredients ON restaurants USING GIN (ingredients_keywords);

-- Update existing restaurants with sample data
UPDATE restaurants SET 
  dietary_options = CASE 
    WHEN cuisine_type = 'Italian' THEN ARRAY['vegetarian', 'gluten-free-options']
    WHEN cuisine_type = 'Guatemalan' THEN ARRAY['traditional', 'meat-heavy']
    ELSE ARRAY['varied-options']
  END,
  allergens = CASE 
    WHEN cuisine_type = 'Italian' THEN ARRAY['gluten', 'dairy']
    WHEN cuisine_type = 'Guatemalan' THEN ARRAY['nuts', 'dairy']
    ELSE ARRAY['varies']
  END,
  accessibility_features = CASE 
    WHEN name ILIKE '%bella%' THEN ARRAY['wheelchair-accessible', 'parking-available']
    ELSE ARRAY['ground-floor-access']
  END,
  special_features = CASE 
    WHEN name ILIKE '%pizza%' THEN ARRAY['pet-friendly', 'outdoor-seating', 'wifi']
    WHEN name ILIKE '%típico%' THEN ARRAY['family-friendly', 'traditional-music', 'cultural-experience']
    ELSE ARRAY['air-conditioning']
  END,
  ingredients_keywords = CASE 
    WHEN cuisine_type = 'Italian' THEN ARRAY['tomato', 'cheese', 'basil', 'pasta', 'pizza']
    WHEN cuisine_type = 'Guatemalan' THEN ARRAY['pepián', 'kak''ik', 'corn', 'beans', 'chicken', 'beef']
    ELSE ARRAY['varied-ingredients']
  END
WHERE dietary_options IS NULL OR array_length(dietary_options, 1) IS NULL;

COMMENT ON COLUMN restaurants.dietary_options IS 'Dietary options available: vegan, vegetarian, gluten-free, keto, etc.';
COMMENT ON COLUMN restaurants.allergens IS 'Common allergens present: nuts, dairy, gluten, shellfish, etc.';
COMMENT ON COLUMN restaurants.accessibility_features IS 'Accessibility features: wheelchair-accessible, braille-menu, etc.';
COMMENT ON COLUMN restaurants.special_features IS 'Special features: pet-friendly, outdoor-seating, wifi, etc.';
COMMENT ON COLUMN restaurants.ingredients_keywords IS 'Common ingredients for search: tomato, chicken, pasta, etc.';
