import express from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '@fragrance-battle/database';
import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  APIResponse
} from '@fragrance-battle/types';
import { validate, schemas } from '../middleware/validation';
import { authenticateToken, generateToken } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';

const router = express.Router();

// Register a new user
router.post('/register', validate(schemas.register), asyncHandler(async (req, res) => {
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
router.post('/login', validate(schemas.login), asyncHandler(async (req, res) => {
  const { email, password }: LoginRequest = req.body;

  // Find user
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user || !await bcrypt.compare(password, user.passwordHash)) {
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
router.put('/me', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const { username, email } = req.body;

  // Validation
  if (username && (typeof username !== 'string' || username.length < 3)) {
    throw createError('Username must be at least 3 characters', 400, 'VALIDATION_ERROR');
  }

  if (email && (typeof email !== 'string' || !email.includes('@'))) {
    throw createError('Invalid email format', 400, 'VALIDATION_ERROR');
  }

  // Check if username/email already exists (excluding current user)
  if (username || email) {
    const existingUser = await prisma.user.findFirst({
      where: {
        AND: [
          { id: { not: userId } },
          {
            OR: [
              username ? { username } : {},
              email ? { email } : {}
            ].filter(condition => Object.keys(condition).length > 0)
          }
        ]
      }
    });

    if (existingUser) {
      throw createError(
        existingUser.username === username ? 'Username already exists' : 'Email already exists',
        400,
        'USER_EXISTS'
      );
    }
  }

  // Update user
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(username && { username }),
      ...(email && { email })
    },
    select: {
      id: true,
      email: true,
      username: true,
      createdAt: true,
      updatedAt: true
    }
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
