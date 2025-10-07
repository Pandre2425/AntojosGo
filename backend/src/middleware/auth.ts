import { Request, Response, NextFunction } from 'express';
import { verifyFirebaseToken } from '../config/firebase';
import { supabase } from '../config/supabase';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: any;
}

export async function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    // Try JWT verification first
    try {
      const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_fallback';
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      // Get user from database
      const { data: user, error } = await supabase
        .from('users')
        .select('id, name, email, profile_image')
        .eq('id', decoded.id)
        .single();

      if (error || !user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid token - user not found'
        });
      }

      req.user = { id: user.id, email: user.email, name: user.name };
      next();
      return;
    } catch (jwtError) {
      // JWT verification failed, try other methods
    }

    // Try Firebase token verification
    try {
      const firebaseUser = await verifyFirebaseToken(token);
      req.user = firebaseUser;
      next();
      return;
    } catch (firebaseError) {
      // Firebase verification failed, try temp token
    }

    // Try temp token (backward compatibility)
    if (token.startsWith('temp_token_') || token.startsWith('google_token_')) {
      const userId = token.replace(/^(temp_token_|google_token_)/, '');
      
      const { data: user, error } = await supabase
        .from('users')
        .select('id, name, email, profile_image')
        .eq('id', userId)
        .single();

      if (error || !user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid token'
        });
      }

      req.user = { id: user.id, email: user.email, name: user.name };
      next();
      return;
    }

    // All verification methods failed
    return res.status(403).json({
      success: false,
      error: 'Invalid or expired token'
    });
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(403).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  verifyFirebaseToken(token)
    .then(user => {
      req.user = user;
      next();
    })
    .catch(() => {
      req.user = null;
      next();
    });
}