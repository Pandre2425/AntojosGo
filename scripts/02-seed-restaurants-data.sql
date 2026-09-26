-- Seed some sample restaurants for AntojosGo
INSERT INTO restaurants (name, description, cuisine_type, address, latitude, longitude, phone, price_range, rating, total_reviews, image_url, features) VALUES
('Tacos El Güero', 'Authentic Guatemalan tacos with traditional flavors and fresh ingredients', 'Guatemalan', '5a Avenida Norte #15, Antigua Guatemala', 14.5586, -90.7339, '+502 7832-1234', 2, 4.5, 127, '/guatemalan-tacos.png', ARRAY['outdoor seating', 'takeout', 'vegetarian options']),

('Pizza Bella Vista', 'Wood-fired pizzas with a view of the volcanoes', 'Italian', 'Calle del Arco #32, Antigua Guatemala', 14.5592, -90.7345, '+502 7832-5678', 3, 4.2, 89, '/pizza-restaurant-interior.png', ARRAY['outdoor seating', 'wine selection', 'romantic atmosphere']),

('Café Sky', 'Rooftop restaurant with panoramic views and international cuisine', 'International', '1a Avenida Sur #15, Antigua Guatemala', 14.5578, -90.7331, '+502 7832-9012', 3, 4.7, 203, '/placeholder-ws0y7.png', ARRAY['rooftop dining', 'cocktails', 'live music', 'wifi']),

('Comedor Típico Doña María', 'Traditional Guatemalan home cooking in a family atmosphere', 'Guatemalan', '4a Calle Poniente #27, Antigua Guatemala', 14.5595, -90.7352, '+502 7832-3456', 1, 4.3, 156, '/placeholder-ws0y7.png', ARRAY['family friendly', 'traditional recipes', 'budget friendly']),

('Sushi Zen', 'Fresh sushi and Japanese cuisine in elegant setting', 'Japanese', '6a Avenida Norte #8, Antigua Guatemala', 14.5589, -90.7342, '+502 7832-7890', 4, 4.1, 67, '/placeholder-ws0y7.png', ARRAY['fresh fish', 'sake selection', 'modern atmosphere']),

('La Fonda de la Calle Real', 'Colonial-style restaurant serving refined Guatemalan cuisine', 'Guatemalan', '3a Calle Oriente #7, Antigua Guatemala', 14.5583, -90.7328, '+502 7832-2345', 3, 4.6, 134, '/placeholder-ws0y7.png', ARRAY['colonial architecture', 'fine dining', 'wine pairing']),

('Burger Joint', 'Gourmet burgers with local ingredients and craft beer', 'American', '2a Avenida Norte #22, Antigua Guatemala', 14.5591, -90.7348, '+502 7832-6789', 2, 4.0, 98, '/placeholder-ws0y7.png', ARRAY['craft beer', 'local ingredients', 'casual dining']),

('Restaurante Panza Verde', 'Upscale dining with fusion cuisine and art gallery', 'Fusion', '5a Avenida Sur #19, Antigua Guatemala', 14.5575, -90.7335, '+502 7832-4567', 4, 4.8, 89, '/placeholder-ws0y7.png', ARRAY['art gallery', 'fine dining', 'romantic', 'wine cellar']);
