import express from 'express';
import axios from 'axios';
import { supabase } from '../config/supabase';
import { optionalAuth, AuthRequest } from '../middleware/auth';
import { validateBody, schemas } from '../middleware/validation';

const router = express.Router();

// AI-powered restaurant recommendations
router.post('/recommendations', optionalAuth, validateBody(schemas.aiQuery), async (req: AuthRequest, res) => {
  try {
    const { query, latitude, longitude, preferences } = req.body;

    console.log('AI Query:', { query, latitude, longitude, preferences });

    // Step 1: Use OpenAI to interpret the user's craving
    const interpretation = await interpretCraving(query, preferences);
    
    // Step 2: Search for restaurants based on interpretation
    let restaurants = await searchRestaurants(interpretation, latitude, longitude);

    // Step 3: If we have Google Maps API, enhance with nearby places
    if (process.env.GOOGLE_MAPS_API_KEY && latitude && longitude) {
      const nearbyPlaces = await searchNearbyPlaces(interpretation, latitude, longitude);
      restaurants = [...restaurants, ...nearbyPlaces];
    }

    // Step 4: Remove duplicates and limit results
    const uniqueRestaurants = removeDuplicates(restaurants);
    const limitedResults = uniqueRestaurants.slice(0, 10);

    res.json({
      success: true,
      query,
      interpretation,
      results: limitedResults,
      count: limitedResults.length
    });

  } catch (error) {
    console.error('AI recommendations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate recommendations',
      fallback: await getFallbackRecommendations()
    });
  }
});

// Chat with AI about food preferences
router.post('/chat', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { message, context } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    const response = await chatWithAI(message, context);

    res.json({
      success: true,
      response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Chat service unavailable',
      response: 'I\'m sorry, I\'m having trouble understanding right now. Try asking about specific food types or cuisines!'
    });
  }
});

// Helper functions

async function interpretCraving(query: string, preferences?: any): Promise<any> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      // Fallback interpretation without OpenAI
      return interpretCravingFallback(query);
    }

    const openaiResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a food recommendation expert. Analyze the user's craving and extract:
          1. cuisine_type (e.g., "italian", "mexican", "asian")
          2. food_category (e.g., "pizza", "tacos", "sushi")
          3. price_range (e.g., "$", "$$", "$$$")
          4. dietary_preferences (e.g., "vegetarian", "vegan", "gluten-free")
          5. mood (e.g., "comfort", "healthy", "fancy")
          
          Respond with a JSON object only.`
        },
        {
          role: 'user',
          content: `I want: ${query}. My preferences: ${JSON.stringify(preferences || {})}`
        }
      ],
      temperature: 0.7,
      max_tokens: 200
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const content = openaiResponse.data.choices[0].message.content;
    return JSON.parse(content);

  } catch (error) {
    console.error('OpenAI interpretation error:', error);
    return interpretCravingFallback(query);
  }
}

function interpretCravingFallback(query: string): any {
  const lowerQuery = query.toLowerCase();
  
  // Simple keyword matching for fallback
  const interpretation: any = {
    cuisine_type: 'general',
    food_category: 'food',
    price_range: '$$',
    dietary_preferences: [],
    mood: 'casual'
  };

  // Detect cuisine types
  if (lowerQuery.includes('pizza') || lowerQuery.includes('italian')) {
    interpretation.cuisine_type = 'italian';
    interpretation.food_category = 'pizza';
  } else if (lowerQuery.includes('taco') || lowerQuery.includes('mexican')) {
    interpretation.cuisine_type = 'mexican';
    interpretation.food_category = 'tacos';
  } else if (lowerQuery.includes('sushi') || lowerQuery.includes('japanese')) {
    interpretation.cuisine_type = 'japanese';
    interpretation.food_category = 'sushi';
  } else if (lowerQuery.includes('burger')) {
    interpretation.cuisine_type = 'american';
    interpretation.food_category = 'burgers';
  } else if (lowerQuery.includes('chinese')) {
    interpretation.cuisine_type = 'chinese';
  }

  // Detect dietary preferences
  if (lowerQuery.includes('vegan')) {
    interpretation.dietary_preferences.push('vegan');
  }
  if (lowerQuery.includes('vegetarian')) {
    interpretation.dietary_preferences.push('vegetarian');
  }

  return interpretation;
}

async function searchRestaurants(interpretation: any, latitude?: number, longitude?: number): Promise<any[]> {
  try {
    let query = supabase.from('restaurants').select('*');

    // Filter by cuisine type
    if (interpretation.cuisine_type && interpretation.cuisine_type !== 'general') {
      query = query.ilike('category', `%${interpretation.cuisine_type}%`);
    }

    // Filter by price range
    if (interpretation.price_range) {
      query = query.eq('price_range', interpretation.price_range);
    }

    const { data: restaurants, error } = await query.limit(20);

    if (error) {
      console.error('Database search error:', error);
      return [];
    }

    // Add distance if location provided
    if (latitude && longitude && restaurants) {
      return restaurants.map(restaurant => ({
        ...restaurant,
        distance: restaurant.coordinates ? calculateDistance(
          latitude, longitude,
          restaurant.coordinates.latitude,
          restaurant.coordinates.longitude
        ) : null,
        source: 'database'
      })).sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }

    return (restaurants || []).map(r => ({ ...r, source: 'database' }));

  } catch (error) {
    console.error('Restaurant search error:', error);
    return [];
  }
}

async function searchNearbyPlaces(interpretation: any, latitude: number, longitude: number): Promise<any[]> {
  try {
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      return [];
    }

    const radius = 5000; // 5km radius
    const type = 'restaurant';
    const keyword = interpretation.food_category || interpretation.cuisine_type;

    const response = await axios.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', {
      params: {
        location: `${latitude},${longitude}`,
        radius,
        type,
        keyword,
        key: process.env.GOOGLE_MAPS_API_KEY
      }
    });

    return response.data.results.slice(0, 10).map((place: any) => ({
      id: place.place_id,
      name: place.name,
      category: interpretation.cuisine_type,
      address: place.vicinity,
      coordinates: {
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng
      },
      rating: place.rating,
      price_range: place.price_level ? '$'.repeat(place.price_level) : '$$',
      image_url: place.photos && place.photos[0] ? 
        `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${process.env.GOOGLE_MAPS_API_KEY}` 
        : null,
      google_place_id: place.place_id,
      source: 'google',
      distance: calculateDistance(
        latitude, longitude,
        place.geometry.location.lat,
        place.geometry.location.lng
      )
    }));

  } catch (error) {
    console.error('Google Places search error:', error);
    return [];
  }
}

async function chatWithAI(message: string, context?: any): Promise<string> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return generateFallbackResponse(message);
    }

    const openaiResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are AntojosGo's food assistant. Help users discover great food and restaurants. 
          Be friendly, concise, and focus on food recommendations. Ask follow-up questions to better understand their preferences.`
        },
        ...(context?.previousMessages || []),
        {
          role: 'user',
          content: message
        }
      ],
      temperature: 0.8,
      max_tokens: 150
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return openaiResponse.data.choices[0].message.content.trim();

  } catch (error) {
    console.error('OpenAI chat error:', error);
    return generateFallbackResponse(message);
  }
}

function generateFallbackResponse(message: string): string {
  const responses = [
    "That sounds delicious! What type of cuisine are you in the mood for?",
    "Great choice! Are you looking for something nearby or a specific restaurant?",
    "I'd love to help you find the perfect meal! Tell me more about what you're craving.",
    "Yum! Are you thinking more casual dining or something fancy?",
    "That sounds amazing! Do you have any dietary preferences I should know about?"
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
}

async function getFallbackRecommendations(): Promise<any[]> {
  try {
    const { data: restaurants, error } = await supabase
      .from('restaurants')
      .select('*')
      .limit(5)
      .order('rating', { ascending: false });

    return restaurants || [];
  } catch (error) {
    return [];
  }
}

function removeDuplicates(restaurants: any[]): any[] {
  const seen = new Set();
  return restaurants.filter(restaurant => {
    const identifier = restaurant.google_place_id || restaurant.id || restaurant.name;
    if (seen.has(identifier)) {
      return false;
    }
    seen.add(identifier);
    return true;
  });
}

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