import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import { connectDatabase } from '@fragrance-battle/database';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';

// Import routes
import authRoutes from './routes/auth';
import fragranceRoutes from './routes/fragrances';
import collectionRoutes from './routes/collections';
import battleRoutes from './routes/battles';
import aiRoutes from './routes/ai';
import userRoutes from './routes/users';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5173'
  ],
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/fragrances', fragranceRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/battles', battleRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/users', userRoutes);

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Fragrance Battle AI API',
    version: process.env.npm_package_version || '1.0.0',
    description: 'API for the fragrance battle AI application',
    endpoints: {
      auth: {
        'POST /api/auth/register': 'Register a new user',
        'POST /api/auth/login': 'Login user',
        'GET /api/auth/me': 'Get current user info',
        'PUT /api/auth/me': 'Update user profile',
      },
      fragrances: {
        'GET /api/fragrances': 'Get all fragrances with optional filters',
        'POST /api/fragrances': 'Create a new fragrance',
        'GET /api/fragrances/:id': 'Get fragrance by ID',
        'PUT /api/fragrances/:id': 'Update fragrance by ID',
        'DELETE /api/fragrances/:id': 'Delete fragrance by ID',
        'POST /api/fragrances/search': 'Search fragrances',
      },
      collections: {
        'GET /api/collections': 'Get user collections',
        'POST /api/collections': 'Create new collection',
        'GET /api/collections/:id': 'Get collection by ID',
        'PUT /api/collections/:id': 'Update collection',
        'DELETE /api/collections/:id': 'Delete collection',
        'POST /api/collections/:id/items': 'Add fragrance to collection',
        'DELETE /api/collections/:id/items/:itemId': 'Remove fragrance from collection',
      },
      battles: {
        'GET /api/battles': 'Get user battles',
        'POST /api/battles': 'Create new battle',
        'GET /api/battles/:id': 'Get battle by ID',
        'PUT /api/battles/:id': 'Update battle',
        'DELETE /api/battles/:id': 'Delete battle',
        'POST /api/battles/:id/vote': 'Vote in battle',
        'POST /api/battles/:id/complete': 'Complete battle',
      },
      ai: {
        'POST /api/ai/categorize': 'Categorize fragrance using AI',
        'POST /api/ai/feedback': 'Submit feedback for AI categorization',
        'GET /api/ai/health': 'Check AI service health',
      },
      users: {
        'GET /api/users/analytics': 'Get user analytics',
        'GET /api/users/profile': 'Get user profile',
        'PUT /api/users/profile': 'Update user profile',
      }
    }
  });
});

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();

    // Start listening
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📖 API documentation available at http://localhost:${PORT}/api`);
      console.log(`🏥 Health check available at http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

startServer();

export default app;
