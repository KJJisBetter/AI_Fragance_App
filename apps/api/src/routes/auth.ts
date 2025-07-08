import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@fragrance-battle/database';
import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  APIResponse
} from '@fragrance-battle/types';
import { validateBody, userSchemas } from '../middleware/validation';
import { authenticateToken, generateToken } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { config } from '../config';
import { log } from '../utils/logger';

const router = express.Router();

// Register a new user
router.post('/register', validateBody(userSchemas.register), asyncHandler(async (req, res) => {
  const { email, username, password }: RegisterRequest = req.body;

  // Check if user already exists
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email },
        { username }
      ]
    }
  });

  if (existingUser) {
    log.api.error(req.method, req.originalUrl, new Error('User registration failed - user exists'), undefined);
    throw createError(
      existingUser.email === email ? 'Email already exists' : 'Username already exists',
      400,
      'USER_EXISTS'
    );
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      username,
      passwordHash
    },
    select: {
      id: true,
      email: true,
      username: true,
      createdAt: true,
      updatedAt: true
    }
  });

  // Create default collection for user
  await prisma.collection.create({
    data: {
      userId: user.id,
      name: 'My Collection',
      description: 'Your personal fragrance collection'
    }
  });

  // Generate token
  const token = generateToken(user);

  log.info('🔐 User registered successfully', {
    userId: user.id,
    email: user.email,
    username: user.username
  });

  const response: APIResponse<AuthResponse> = {
    success: true,
    data: {
      user,
      token
    }
  };

  res.status(201).json(response);
}));

// Login user
router.post('/login', validateBody(userSchemas.login), asyncHandler(async (req, res) => {
  const { email, password }: LoginRequest = req.body;

  // Find user
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user || !await bcrypt.compare(password, user.passwordHash)) {
    log.api.error(req.method, req.originalUrl, new Error('Login failed - invalid credentials'), undefined);
    throw createError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  // Generate token
  const token = generateToken(user);

  const userResponse = {
    id: user.id,
    email: user.email,
    username: user.username,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };

  log.info('🔐 User logged in successfully', {
    userId: user.id,
    email: user.email
  });

  const response: APIResponse<AuthResponse> = {
    success: true,
    data: {
      user: userResponse,
      token
    }
  };

  res.json(response);
}));

// Get current user info
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
  const user = req.user!;

  const response: APIResponse<Omit<AuthResponse, 'token'>> = {
    success: true,
    data: {
      user
    }
  };

  res.json(response);
}));

// Update user profile
router.put('/me', authenticateToken, validateBody(userSchemas.updateProfile), asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const { username, bio } = req.body;

  // Check if username already exists (excluding current user)
  if (username) {
    const existingUser = await prisma.user.findFirst({
      where: {
        AND: [
          { id: { not: userId } },
          { username }
        ]
      }
    });

    if (existingUser) {
      log.api.error(req.method, req.originalUrl, new Error('Profile update failed - username exists'), userId);
      throw createError('Username already exists', 400, 'USER_EXISTS');
    }
  }

  // Update user
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(username && { username }),
      ...(bio && { bio })
    },
    select: {
      id: true,
      email: true,
      username: true,
      bio: true,
      createdAt: true,
      updatedAt: true
    }
  });

  log.info('🔐 User profile updated successfully', {
    userId: updatedUser.id,
    changes: Object.keys(req.body)
  });

  const response: APIResponse<Omit<AuthResponse, 'token'>> = {
    success: true,
    data: {
      user: updatedUser
    }
  };

  res.json(response);
}));

// Change password
router.put('/change-password', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw createError('Current password and new password are required', 400, 'VALIDATION_ERROR');
  }

  if (newPassword.length < 6) {
    throw createError('New password must be at least 6 characters', 400, 'VALIDATION_ERROR');
  }

  // Get user with password hash
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user || !await bcrypt.compare(currentPassword, user.passwordHash)) {
    throw createError('Current password is incorrect', 401, 'INVALID_CREDENTIALS');
  }

  // Hash new password
  const passwordHash = await bcrypt.hash(newPassword, 10);

  // Update password
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash }
  });

  const response: APIResponse<{ message: string }> = {
    success: true,
    data: {
      message: 'Password updated successfully'
    }
  };

  res.json(response);
}));

// Delete account
router.delete('/me', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user!.id;

  // Delete user and all related data (handled by cascade)
  await prisma.user.delete({
    where: { id: userId }
  });

  const response: APIResponse<{ message: string }> = {
    success: true,
    data: {
      message: 'Account deleted successfully'
    }
  };

  res.json(response);
}));

export default router;
