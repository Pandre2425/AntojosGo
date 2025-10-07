import express from 'express';
import { supabase, Restaurant } from '../config/supabase';
import { validateQuery, schemas } from '../middleware/validation';
import { optionalAuth, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get all restaurants with optional filtering
router.get('/', optionalAuth, validateQuery(schemas.restaurantSearch), async (req: AuthRequest, res) => {
  try {
    const { latitude, longitude, radius = 10, cuisineType, priceRange } = req.query;

    let query = supabase.from('restaurants').select('*');

    // Filter by cuisine type
    if (cuisineType) {
      query = query.eq('category', cuisineType);
    }

    // Filter by price range
    if (priceRange) {
      query = query.eq('price_range', priceRange);
    }

    const { data: restaurants, error } = await query.order('name');

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch restaurants'
      });
    }

    // If location provided, calculate distance and filter by radius
    let filteredRestaurants = restaurants || [];
    
    if (latitude && longitude) {
      const userLat = parseFloat(latitude as string);
      const userLng = parseFloat(longitude as string);
      const radiusKm = parseFloat(radius as string);

      filteredRestaurants = restaurants?.filter(restaurant => {
        if (!restaurant.coordinates) return false;
        
        const distance = calculateDistance(
          userLat, userLng,
          restaurant.coordinates.latitude, 
          restaurant.coordinates.longitude
        );
        
        return distance <= radiusKm;
      }).map(restaurant => ({
        ...restaurant,
        distance: calculateDistance(
          userLat, userLng,
          restaurant.coordinates.latitude, 
          restaurant.coordinates.longitude
        )
      })).sort((a, b) => a.distance - b.distance) || [];
    }

    res.json(filteredRestaurants);

  } catch (error) {
    console.error('Get restaurants error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get restaurant by ID
router.get('/:id', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .select(`
        *,
        foods (*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Database error:', error);
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found'
      });
    }

    res.json(restaurant);

  } catch (error) {
    console.error('Get restaurant error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Search restaurants
router.get('/search', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Search query required'
      });
    }

    const { data: restaurants, error } = await supabase
      .from('restaurants')
      .select('*')
      .or(`name.ilike.%${q}%, description.ilike.%${q}%, category.ilike.%${q}%`)
      .order('name');

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({
        success: false,
        error: 'Search failed'
      });
    }

    res.json(restaurants || []);

  } catch (error) {
    console.error('Search restaurants error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Helper function to calculate distance between two points
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = deg2rad(lat2 - lat1);
  const dLng = deg2rad(lng2 - lng1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return distance;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI/180);
}

export default router;