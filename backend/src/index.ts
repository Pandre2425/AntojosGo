import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth';
import restaurantRoutes from './routes/restaurants';
import profileRoutes from './routes/profile';
import aiRoutes from './routes/ai';
import uploadRoutes from './routes/upload';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { setupFirebase } from './config/firebase';

// Initialize database tables if needed
import { initializeDatabase } from './scripts/initDatabase';

const app = express();
const PORT = process.env.PORT || 8800;
const API_PREFIX = process.env.API_PREFIX || '/api';

// Initialize Firebase Admin (for token verification)
setupFirebase();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration for mobile app
app.use(cors({
  origin: [
    'http://localhost:8081', // Expo dev server
    'http://192.168.1.1:8081', // Local network access
    'http://10.0.0.1:8081', // iOS Simulator
    'exp://localhost:8081',
    'exp://192.168.1.1:8081',
    'exp://10.0.0.1:8081',
    'http://localhost:3000', // Web dev
    'http://localhost:19006' // Expo web
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined'));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'AntojosGo Backend is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    port: PORT
  });
});

// API Routes
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/restaurants`, restaurantRoutes);
app.use(`${API_PREFIX}/profile`, profileRoutes);
app.use(`${API_PREFIX}/ai`, aiRoutes);
app.use(`${API_PREFIX}/upload`, uploadRoutes);

// 404 handler for API routes
app.use(`${API_PREFIX}/*`, (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found'
  });
});

// Global error handler
app.use(errorHandler);

// Initialize database on startup (optional)
async function startServer() {
  try {
    // Confirm Supabase connection
    console.log('🔗 Connecting to Supabase...');
    
    // Initialize database tables if needed (optional - can be done separately)
    if (process.env.INIT_DATABASE === 'true') {
      await initializeDatabase();
    }
    
    // Start server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 AntojosGo Backend running on port ${PORT}`);
      console.log(`📱 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔗 API Base URL: http://localhost:${PORT}${API_PREFIX}`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
      console.log(`📚 Available endpoints:`);
      console.log(`   POST ${API_PREFIX}/auth/login`);
      console.log(`   POST ${API_PREFIX}/auth/register`);
      console.log(`   GET  ${API_PREFIX}/restaurants`);
      console.log(`   GET  ${API_PREFIX}/restaurants/:id`);
      console.log(`   POST ${API_PREFIX}/ai/recommendations`);
      console.log(`   POST ${API_PREFIX}/upload/image`);
      console.log(`   GET  ${API_PREFIX}/profile`);
    });
  } catch (error) {
    console.error('❌ Server startup error:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;