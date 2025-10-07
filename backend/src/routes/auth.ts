import express from 'express';
import { supabase, User } from '../config/supabase';
import { verifyFirebaseToken } from '../config/firebase';
import { validateBody, schemas } from '../middleware/validation';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const router = express.Router();

// JWT utility functions
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_fallback';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function generateJWT(userId: string, email: string): string {
  return jwt.sign(
    { 
      id: userId, 
      email,
      type: 'access'
    }, 
    JWT_SECRET, 
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

function comparePasswords(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Register endpoint
router.post('/register', validateBody(schemas.register), async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User already exists with this email'
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);
    const userId = uuidv4();
    
    const userData = {
      id: userId,
      name,
      email,
      password_hash: hashedPassword,
      firebase_uid: null // Will be set if Firebase auth is used later
    };

    const { data, error } = await supabase
      .from('users')
      .insert(userData)
      .select('id, name, email, profile_image')
      .single();

    if (error) {
      console.error('Database error:', error);
      return res.status(400).json({
        success: false,
        error: 'User creation failed'
      });
    }

    // Generate JWT token
    const token = generateJWT(data.id, data.email);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: data.id,
        name: data.name,
        email: data.email,
        profileImage: data.profile_image
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
  }
});

// Login endpoint
router.post('/login', validateBody(schemas.login), async (req, res) => {
  try {
    const { email, password } = req.body;

    // For development, we'll find user by email
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    res.json({
      success: true,
      token: `temp_token_${user.id}`, // Temporary token for development
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profileImage: user.profile_image
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

// Google OAuth endpoint
router.post('/google', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Google token required'
      });
    }

    // Verify Google token (simplified for development)
    // In production, verify with Firebase or Google API
    const userData = {
      id: uuidv4(),
      name: 'Google User',
      email: 'google@example.com',
      firebase_uid: 'google_temp_uid'
    };

    res.json({
      success: true,
      token: `google_token_${userData.id}`,
      user: userData
    });

  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({
      success: false,
      error: 'Google authentication failed'
    });
  }
});

// Token verification endpoint
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token required'
      });
    }

    // For development, extract user ID from token
    if (token.startsWith('temp_token_') || token.startsWith('google_token_')) {
      const userId = token.replace(/^(temp_token_|google_token_)/, '');
      
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid token'
        });
      }

      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        profileImage: user.profile_image
      });
    } else {
      // Try Firebase token verification
      try {
        const firebaseUser = await verifyFirebaseToken(token);
        
        // Find or create user in our database
        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('firebase_uid', firebaseUser.uid)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (!user) {
          // Create new user
          const newUser = {
            id: uuidv4(),
            name: firebaseUser.name || firebaseUser.email,
            email: firebaseUser.email,
            firebase_uid: firebaseUser.uid
          };

          const { data: createdUser, error: createError } = await supabase
            .from('users')
            .insert(newUser)
            .select()
            .single();

          if (createError) {
            throw createError;
          }

          res.json({
            id: createdUser.id,
            name: createdUser.name,
            email: createdUser.email,
            profileImage: createdUser.profile_image
          });
        } else {
          res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            profileImage: user.profile_image
          });
        }
      } catch (firebaseError) {
        return res.status(401).json({
          success: false,
          error: 'Invalid Firebase token'
        });
      }
    }

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Token verification failed'
    });
  }
});

export default router;