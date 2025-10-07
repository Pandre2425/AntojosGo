import express from 'express';
import { supabase } from '../config/supabase';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { validateBody, schemas } from '../middleware/validation';

const router = express.Router();

// Get user profile
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.uid || req.user?.id;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq(req.user?.uid ? 'firebase_uid' : 'id', userId)
      .single();

    if (error) {
      console.error('Database error:', error);
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      profileImage: user.profile_image,
      preferences: user.preferences,
      location: user.location
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Update user profile
router.put('/', authenticateToken, validateBody(schemas.updateProfile), async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.uid || req.user?.id;
    const updates = req.body;

    // Add updated_at timestamp
    updates.updated_at = new Date().toISOString();

    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq(req.user?.uid ? 'firebase_uid' : 'id', userId)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return res.status(400).json({
        success: false,
        error: 'Profile update failed'
      });
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      profileImage: user.profile_image,
      preferences: user.preferences,
      location: user.location
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Delete user profile
router.delete('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.uid || req.user?.id;

    const { error } = await supabase
      .from('users')
      .delete()
      .eq(req.user?.uid ? 'firebase_uid' : 'id', userId);

    if (error) {
      console.error('Database error:', error);
      return res.status(400).json({
        success: false,
        error: 'Profile deletion failed'
      });
    }

    res.json({
      success: true,
      message: 'Profile deleted successfully'
    });

  } catch (error) {
    console.error('Delete profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;