-- Seeding initial data for restaurant management system

-- Insert default categories
INSERT INTO categories (name, description, icon) VALUES
('Comida Típica', 'Platillos tradicionales guatemaltecos', '🇬🇹'),
('Pizza', 'Pizzas artesanales y tradicionales', '🍕'),
('Hamburguesas', 'Hamburguesas gourmet y clásicas', '🍔'),
('Mariscos', 'Pescados y mariscos frescos', '🐟'),
('Postres', 'Dulces y postres caseros', '🍰'),
('Vegano', 'Opciones 100% vegetales', '🌱'),
('Saludable', 'Comida nutritiva y balanceada', '🥗'),
('Café', 'Café de especialidad y bebidas', '☕'),
('Comida Rápida', 'Opciones rápidas y convenientes', '⚡'),
('Internacional', 'Cocina de diferentes países', '🌍')
ON CONFLICT (name) DO NOTHING;

-- Insert sample restaurants
INSERT INTO restaurants (
    name, email, password_hash, description, address, latitude, longitude, 
    phone, website, price_range, service_options, opening_hours, legal_info
) VALUES
(
    'Restaurante Típico Chapín',
    'info@tipicochapin.com',
    '$2b$10$example_hash_1',
    'Auténtica comida guatemalteca en el corazón de la ciudad. Especialistas en pepián, kak''ik y otros platillos tradicionales.',
    '6a Avenida 14-55, Zona 1, Ciudad de Guatemala',
    14.6349, -90.5069,
    '+502 2251-4567',
    'https://tipicochapin.com',
    '$$',
    '["dine_in", "takeout"]',
    '{"monday": "11:00-21:00", "tuesday": "11:00-21:00", "wednesday": "11:00-21:00", "thursday": "11:00-21:00", "friday": "11:00-22:00", "saturday": "11:00-22:00", "sunday": "11:00-20:00"}',
    '{"nit": "12345678-9", "business_license": "GT-2024-001"}'
),
(
    'Pizzería Bella Napoli',
    'contact@bellanapoli.gt',
    '$2b$10$example_hash_2',
    'Pizzas artesanales con ingredientes importados de Italia. Masa fermentada 48 horas y horno de leña.',
    'Calzada Roosevelt 15-23, Zona 11, Ciudad de Guatemala',
    14.6118, -90.5328,
    '+502 2440-8901',
    'https://bellanapoli.gt',
    '$$$',
    '["dine_in", "takeout", "delivery"]',
    '{"monday": "closed", "tuesday": "17:00-23:00", "wednesday": "17:00-23:00", "thursday": "17:00-23:00", "friday": "17:00-24:00", "saturday": "12:00-24:00", "sunday": "12:00-22:00"}',
    '{"nit": "87654321-0", "business_license": "GT-2024-002"}'
),
(
    'Green Garden Café',
    'hello@greengarden.com.gt',
    '$2b$10$example_hash_3',
    'Café vegano con opciones saludables. Smoothies, ensaladas frescas y postres sin azúcar refinada.',
    '4a Calle 3-45, Zona 10, Ciudad de Guatemala',
    14.5995, -90.5069,
    '+502 2367-1234',
    'https://greengarden.com.gt',
    '$$',
    '["dine_in", "takeout"]',
    '{"monday": "07:00-19:00", "tuesday": "07:00-19:00", "wednesday": "07:00-19:00", "thursday": "07:00-19:00", "friday": "07:00-20:00", "saturday": "08:00-20:00", "sunday": "08:00-18:00"}',
    '{"nit": "11223344-5", "business_license": "GT-2024-003"}'
);

-- Link restaurants to categories
INSERT INTO restaurant_categories (restaurant_id, category_id)
SELECT r.id, c.id FROM restaurants r, categories c 
WHERE (r.name = 'Restaurante Típico Chapín' AND c.name = 'Comida Típica');

INSERT INTO restaurant_categories (restaurant_id, category_id)
SELECT r.id, c.id FROM restaurants r, categories c 
WHERE (r.name = 'Pizzería Bella Napoli' AND c.name = 'Pizza');

INSERT INTO restaurant_categories (restaurant_id, category_id)
SELECT r.id, c.id FROM restaurants r, categories c 
WHERE (r.name = 'Green Garden Café' AND c.name IN ('Vegano', 'Saludable', 'Café'));

-- Insert sample dishes
INSERT INTO dishes (restaurant_id, name, description, ingredients, category, price, allergens, dietary_info)
SELECT 
    r.id,
    'Pepián de Pollo',
    'Tradicional guiso guatemalteco con pollo en salsa de tomate y especias',
    ARRAY['pollo', 'tomate', 'chile pimiento', 'ajonjolí', 'cilantro'],
    'Plato Principal',
    65.00,
    ARRAY['ajonjolí'],
    ARRAY['gluten_free']
FROM restaurants r WHERE r.name = 'Restaurante Típico Chapín';

INSERT INTO dishes (restaurant_id, name, description, ingredients, category, price, dietary_info)
SELECT 
    r.id,
    'Pizza Margherita',
    'Pizza clásica con salsa de tomate, mozzarella fresca y albahaca',
    ARRAY['masa de pizza', 'salsa de tomate', 'mozzarella', 'albahaca'],
    'Pizza',
    85.00,
    ARRAY['vegetarian']
FROM restaurants r WHERE r.name = 'Pizzería Bella Napoli';

INSERT INTO dishes (restaurant_id, name, description, ingredients, category, price, allergens, dietary_info)
SELECT 
    r.id,
    'Bowl Energético',
    'Quinoa, aguacate, espinacas, semillas y aderezo de tahini',
    ARRAY['quinoa', 'aguacate', 'espinacas', 'semillas de girasol', 'tahini'],
    'Ensalada',
    45.00,
    ARRAY['ajonjolí'],
    ARRAY['vegan', 'gluten_free']
FROM restaurants r WHERE r.name = 'Green Garden Café';

-- Insert sample reviews
INSERT INTO restaurant_reviews (restaurant_id, user_name, user_email, rating, comment)
SELECT 
    r.id,
    'María González',
    'maria@email.com',
    5,
    'Excelente comida típica, el pepián estaba delicioso. Muy recomendado para turistas y locales.'
FROM restaurants r WHERE r.name = 'Restaurante Típico Chapín';

INSERT INTO restaurant_reviews (restaurant_id, user_name, user_email, rating, comment)
SELECT 
    r.id,
    'Carlos Mendoza',
    'carlos@email.com',
    4,
    'Las pizzas son auténticas, la masa está perfecta. El ambiente es muy acogedor.'
FROM restaurants r WHERE r.name = 'Pizzería Bella Napoli';

-- Insert sample restaurant images
INSERT INTO restaurant_images (restaurant_id, url, type, caption, is_primary)
SELECT 
    r.id,
    '/placeholder.svg?height=400&width=600',
    'interior',
    'Interior acogedor del restaurante',
    true
FROM restaurants r WHERE r.name = 'Restaurante Típico Chapín';

INSERT INTO restaurant_images (restaurant_id, url, type, caption, is_primary)
SELECT 
    r.id,
    '/placeholder.svg?height=400&width=600',
    'interior',
    'Horno de leña artesanal',
    true
FROM restaurants r WHERE r.name = 'Pizzería Bella Napoli';
