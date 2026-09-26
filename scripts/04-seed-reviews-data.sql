-- Seed sample reviews for AntojosGo restaurants
INSERT INTO reviews (restaurant_id, user_name, rating, title, comment, visit_date) VALUES
-- Reviews for Tacos El Güero
((SELECT id FROM restaurants WHERE name = 'Tacos El Güero'), 'María González', 5, 'Auténticos y deliciosos', 'Los mejores tacos típicos que he probado en Antigua. El sabor es increíble y los precios muy justos. Definitivamente regresaré.', '2024-01-15'),
((SELECT id FROM restaurants WHERE name = 'Tacos El Güero'), 'Carlos Mendoza', 4, 'Muy buenos tacos', 'Excelente sabor y porciones generosas. El lugar es pequeño pero acogedor. Solo le falta un poco más de variedad en las salsas.', '2024-01-20'),
((SELECT id FROM restaurants WHERE name = 'Tacos El Güero'), 'Ana Rodríguez', 5, 'Tradición pura', 'Como comer en casa de la abuela. Los ingredientes son frescos y se nota la calidad. El servicio es muy amable.', '2024-01-25'),

-- Reviews for Pizza Bella Vista
((SELECT id FROM restaurants WHERE name = 'Pizza Bella Vista'), 'Roberto Silva', 4, 'Buena pizza con vista', 'La pizza está bien preparada y la vista es espectacular. Los precios son un poco altos pero vale la pena por la experiencia.', '2024-01-18'),
((SELECT id FROM restaurants WHERE name = 'Pizza Bella Vista'), 'Lucía Morales', 4, 'Ambiente romántico', 'Perfecto para una cita. La pizza margherita estaba deliciosa y el vino excelente. El servicio fue atento sin ser invasivo.', '2024-01-22'),

-- Reviews for Café Sky
((SELECT id FROM restaurants WHERE name = 'Café Sky'), 'Diego Herrera', 5, 'Vista increíble', 'La mejor vista de Antigua, sin duda. La comida internacional es de muy buena calidad y el ambiente es perfecto para relajarse.', '2024-01-12'),
((SELECT id FROM restaurants WHERE name = 'Café Sky'), 'Patricia López', 5, 'Experiencia completa', 'Desde el momento que llegas hasta que te vas, todo es perfecto. La música en vivo le da un toque especial. Muy recomendado.', '2024-01-28'),
((SELECT id FROM restaurants WHERE name = 'Café Sky'), 'Fernando Castro', 4, 'Buena opción', 'El lugar está muy bien ubicado y la comida es buena. Los cócteles son excelentes. Solo que a veces está muy lleno.', '2024-02-02'),

-- Reviews for Comedor Típico Doña María
((SELECT id FROM restaurants WHERE name = 'Comedor Típico Doña María'), 'Isabel Ramírez', 4, 'Como en casa', 'La comida típica más auténtica que he probado. Doña María cocina con mucho amor y se nota. Precios muy accesibles.', '2024-01-16'),
((SELECT id FROM restaurants WHERE name = 'Comedor Típico Doña María'), 'Miguel Torres', 4, 'Sabor tradicional', 'El pepián estaba espectacular. El ambiente familiar hace que te sientas como en casa. Definitivamente un lugar para volver.', '2024-01-30'),

-- Reviews for Sushi Zen
((SELECT id FROM restaurants WHERE name = 'Sushi Zen'), 'Alejandra Vega', 4, 'Sushi fresco', 'Sorprendentemente bueno para estar en Guatemala. El pescado está fresco y la presentación es elegante. Un poco caro pero vale la pena.', '2024-01-24'),
((SELECT id FROM restaurants WHERE name = 'Sushi Zen'), 'Andrés Jiménez', 4, 'Buena calidad', 'El ambiente es muy zen como su nombre lo indica. El sushi está bien preparado aunque no es el mejor que he probado. Buen servicio.', '2024-02-01'),

-- Reviews for La Fonda de la Calle Real
((SELECT id FROM restaurants WHERE name = 'La Fonda de la Calle Real'), 'Gabriela Flores', 5, 'Elegancia guatemalteca', 'La combinación perfecta entre tradición y elegancia. Cada plato es una obra de arte. El servicio es impecable.', '2024-01-19'),
((SELECT id FROM restaurants WHERE name = 'La Fonda de la Calle Real'), 'Ricardo Paz', 5, 'Experiencia gastronómica', 'Una experiencia culinaria única. Los sabores tradicionales elevados a otro nivel. El maridaje con vinos fue perfecto.', '2024-01-26'),

-- Reviews for Burger Joint
((SELECT id FROM restaurants WHERE name = 'Burger Joint'), 'Sofía Guerrero', 4, 'Hamburguesas gourmet', 'Las hamburguesas están muy bien preparadas con ingredientes locales. Las papas fritas son excelentes. Ambiente casual y relajado.', '2024-01-21'),
((SELECT id FROM restaurants WHERE name = 'Burger Joint'), 'Javier Moreno', 4, 'Buena opción casual', 'Perfecto para una comida informal. La cerveza artesanal complementa muy bien las hamburguesas. Precios razonables.', '2024-01-29'),

-- Reviews for Restaurante Panza Verde
((SELECT id FROM restaurants WHERE name = 'Restaurante Panza Verde'), 'Valentina Cruz', 5, 'Arte y sabor', 'No solo comes bien, también disfrutas del arte. La fusión de sabores es increíble y la presentación impecable. Una experiencia completa.', '2024-01-17'),
((SELECT id FROM restaurants WHERE name = 'Restaurante Panza Verde'), 'Sebastián Ruiz', 5, 'Excepcional', 'Cada visita es una nueva experiencia. La creatividad del chef es impresionante y el servicio es de primer nivel. Vale cada centavo.', '2024-01-31');
