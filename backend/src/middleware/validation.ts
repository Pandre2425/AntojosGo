import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

export function validateBody(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }
    next();
  };
}

export function validateQuery(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }
    next();
  };
}

// Common validation schemas
export const schemas = {
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
  }),

  register: Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
  }),

  updateProfile: Joi.object({
    name: Joi.string().min(2).max(50).optional(),
    profile_image: Joi.string().uri().optional(),
    preferences: Joi.object().optional(),
    location: Joi.object({
      latitude: Joi.number().required(),
      longitude: Joi.number().required()
    }).optional()
  }),

  restaurantSearch: Joi.object({
    q: Joi.string().optional(),
    latitude: Joi.number().optional(),
    longitude: Joi.number().optional(),
    radius: Joi.number().min(1).max(50).optional(),
    cuisineType: Joi.string().optional(),
    priceRange: Joi.string().valid('$', '$$', '$$$', '$$$$').optional()
  }),

  aiQuery: Joi.object({
    query: Joi.string().required(),
    latitude: Joi.number().optional(),
    longitude: Joi.number().optional(),
    preferences: Joi.object().optional()
  })
};