import { supabase } from '../config/supabase';

// Database table creation script
export async function initializeDatabase() {
  console.log('🗄️ Initializing database tables...');

  try {
    // Check if tables exist, if not create them
    const tables = [
      {
        name: 'users',
        sql: `
          CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255),
            profile_image TEXT,
            firebase_uid VARCHAR(255) UNIQUE,
            preferences JSONB DEFAULT '{}',
            location JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          
          -- Create indexes
          CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
          CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
        `
      },
      {
        name: 'restaurants',
        sql: `
          CREATE TABLE IF NOT EXISTS restaurants (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            description TEXT,
            category VARCHAR(100),
            address TEXT NOT NULL,
            coordinates JSONB NOT NULL,
            image_url TEXT,
            rating DECIMAL(2,1) DEFAULT 0,
            price_range VARCHAR(10) DEFAULT '$$',
            hours JSONB,
            phone VARCHAR(50),
            google_place_id VARCHAR(255) UNIQUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          
          -- Create indexes
          CREATE INDEX IF NOT EXISTS idx_restaurants_category ON restaurants(category);
          CREATE INDEX IF NOT EXISTS idx_restaurants_rating ON restaurants(rating);
          CREATE INDEX IF NOT EXISTS idx_restaurants_google_place_id ON restaurants(google_place_id);
        `
      },
      {
        name: 'foods',
        sql: `
          CREATE TABLE IF NOT EXISTS foods (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            description TEXT,
            price DECIMAL(10,2) NOT NULL,
            image_url TEXT,
            restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
            category VARCHAR(100),
            ingredients TEXT[],
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          
          -- Create indexes
          CREATE INDEX IF NOT EXISTS idx_foods_restaurant_id ON foods(restaurant_id);
          CREATE INDEX IF NOT EXISTS idx_foods_category ON foods(category);
          CREATE INDEX IF NOT EXISTS idx_foods_price ON foods(price);
        `
      },
      {
        name: 'user_favorites',
        sql: `
          CREATE TABLE IF NOT EXISTS user_favorites (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id, restaurant_id)
          );
          
          -- Create indexes
          CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
          CREATE INDEX IF NOT EXISTS idx_user_favorites_restaurant_id ON user_favorites(restaurant_id);
        `
      }
    ];

    for (const table of tables) {
      console.log(`Creating table: ${table.name}`);
      const { error } = await supabase.rpc('exec_sql', { sql: table.sql });
      
      if (error) {
        console.error(`Error creating table ${table.name}:`, error);
        // Try alternative method without RPC
        console.log(`Attempting alternative method for ${table.name}...`);
      } else {
        console.log(`✅ Table ${table.name} created successfully`);
      }
    }

    // Insert sample data
    await insertSampleData();

    console.log('🎉 Database initialization completed!');

  } catch (error) {
    console.error('Database initialization error:', error);
    console.log('📝 Note: You may need to run these SQL commands manually in Supabase dashboard');
  }
}

async function insertSampleData() {
  console.log('📝 Inserting sample data...');

  try {
    // Sample restaurants
    const sampleRestaurants = [
      {
        name: 'Pizza Palace',
        description: 'Authentic Italian pizza with fresh ingredients',
        category: 'Italian',
        address: '123 Main St, Downtown',
        coordinates: { latitude: 40.7128, longitude: -74.0060 },
        image_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591',
        rating: 4.5,
        price_range: '$$',
        phone: '+1-555-0123',
        hours: { 
          monday: '11:00-22:00', 
          tuesday: '11:00-22:00',
          wednesday: '11:00-22:00',
          thursday: '11:00-22:00',
          friday: '11:00-23:00',
          saturday: '11:00-23:00',
          sunday: '12:00-21:00'
        }
      },
      {
        name: 'Taco Fiesta',
        description: 'Fresh Mexican street tacos and burritos',
        category: 'Mexican',
        address: '456 Oak Ave, Midtown',
        coordinates: { latitude: 40.7589, longitude: -73.9851 },
        image_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b',
        rating: 4.3,
        price_range: '$',
        phone: '+1-555-0124',
        hours: { 
          monday: '10:00-21:00', 
          tuesday: '10:00-21:00',
          wednesday: '10:00-21:00',
          thursday: '10:00-21:00',
          friday: '10:00-22:00',
          saturday: '10:00-22:00',
          sunday: '11:00-20:00'
        }
      },
      {
        name: 'Sushi Zen',
        description: 'Premium sushi and Japanese cuisine',
        category: 'Japanese',
        address: '789 Pine St, Uptown',
        coordinates: { latitude: 40.7831, longitude: -73.9712 },
        image_url: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351',
        rating: 4.7,
        price_range: '$$$',
        phone: '+1-555-0125',
        hours: { 
          monday: 'Closed', 
          tuesday: '17:00-22:00',
          wednesday: '17:00-22:00',
          thursday: '17:00-22:00',
          friday: '17:00-23:00',
          saturday: '17:00-23:00',
          sunday: '17:00-21:00'
        }
      },
      {
        name: 'Burger Junction',
        description: 'Gourmet burgers and craft beer',
        category: 'American',
        address: '321 Elm St, Westside',
        coordinates: { latitude: 40.7505, longitude: -73.9934 },
        image_url: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add',
        rating: 4.2,
        price_range: '$$',
        phone: '+1-555-0126',
        hours: { 
          monday: '11:00-22:00', 
          tuesday: '11:00-22:00',
          wednesday: '11:00-22:00',
          thursday: '11:00-22:00',
          friday: '11:00-23:00',
          saturday: '11:00-23:00',
          sunday: '12:00-21:00'
        }
      },
      {
        name: 'Green Garden',
        description: 'Healthy vegetarian and vegan options',
        category: 'Vegetarian',
        address: '654 Maple Ave, Eastside',
        coordinates: { latitude: 40.7282, longitude: -73.9776 },
        image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd',
        rating: 4.4,
        price_range: '$$',
        phone: '+1-555-0127',
        hours: { 
          monday: '8:00-20:00', 
          tuesday: '8:00-20:00',
          wednesday: '8:00-20:00',
          thursday: '8:00-20:00',
          friday: '8:00-20:00',
          saturday: '9:00-20:00',
          sunday: '9:00-19:00'
        }
      }
    ];

    const { data: restaurants, error: restaurantError } = await supabase
      .from('restaurants')
      .upsert(sampleRestaurants, { onConflict: 'name' })
      .select();

    if (restaurantError) {
      console.error('Error inserting restaurants:', restaurantError);
    } else {
      console.log(`✅ Inserted ${restaurants?.length || 0} sample restaurants`);

      // Insert sample foods for each restaurant
      if (restaurants && restaurants.length > 0) {
        const sampleFoods = [];

        for (const restaurant of restaurants) {
          if (restaurant.category === 'Italian') {
            sampleFoods.push(
              {
                name: 'Margherita Pizza',
                description: 'Classic pizza with tomato sauce, mozzarella, and basil',
                price: 16.99,
                restaurant_id: restaurant.id,
                category: 'Pizza',
                ingredients: ['tomato sauce', 'mozzarella', 'basil', 'olive oil']
              },
              {
                name: 'Pepperoni Pizza',
                description: 'Traditional pizza with pepperoni and cheese',
                price: 18.99,
                restaurant_id: restaurant.id,
                category: 'Pizza',
                ingredients: ['tomato sauce', 'mozzarella', 'pepperoni']
              }
            );
          } else if (restaurant.category === 'Mexican') {
            sampleFoods.push(
              {
                name: 'Chicken Tacos',
                description: 'Grilled chicken tacos with fresh salsa',
                price: 12.99,
                restaurant_id: restaurant.id,
                category: 'Tacos',
                ingredients: ['grilled chicken', 'corn tortillas', 'salsa', 'onions', 'cilantro']
              },
              {
                name: 'Beef Burrito',
                description: 'Seasoned beef burrito with rice and beans',
                price: 14.99,
                restaurant_id: restaurant.id,
                category: 'Burritos',
                ingredients: ['seasoned beef', 'rice', 'black beans', 'cheese', 'sour cream']
              }
            );
          }
        }

        if (sampleFoods.length > 0) {
          const { error: foodError } = await supabase
            .from('foods')
            .upsert(sampleFoods);

          if (foodError) {
            console.error('Error inserting foods:', foodError);
          } else {
            console.log(`✅ Inserted ${sampleFoods.length} sample food items`);
          }
        }
      }
    }

  } catch (error) {
    console.error('Error inserting sample data:', error);
  }
}

// Run initialization if called directly
if (require.main === module) {
  initializeDatabase();
}