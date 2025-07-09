import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import bcrypt from 'bcryptjs';
import { prisma } from '@fragrance-battle/database';
import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  APIResponse
} from '@fragrance-battle/types';
import { validateBody, userSchemas } from '../middleware/validation';
import { authenticateToken, generateToken } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { log } from '../utils/logger';

export default async function authRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions
) {
  // Register error handler
  fastify.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    if (error.statusCode && error.statusCode < 500) {
      return reply.status(error.statusCode).send({
        success: false,
        error: {
          message: error.message,
          code: error.code || 'CLIENT_ERROR'
        }
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR'
      }
    });
  });

  // Register a new user
  fastify.post('/register', {
    preHandler: [validateBody(userSchemas.register)],
    handler: async (request, reply) => {
      const { email, username, password }: RegisterRequest = request.body as RegisterRequest;

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

      return reply.status(201).send(response);
    }
  });

  // Login user
  fastify.post('/login', {
    preHandler: [validateBody(userSchemas.login)],
    handler: async (request, reply) => {
      const { email, password }: LoginRequest = request.body as LoginRequest;

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

      return reply.send(response);
    }
  });

  // Get current user info
  fastify.get('/me', {
    preHandler: [authenticateToken],
    handler: async (request, reply) => {
      const user = request.user!;

      const response: APIResponse<Omit<AuthResponse, 'token'>> = {
        success: true,
        data: {
          user
        }
      };

      return reply.send(response);
    }
  });

  // Update user profile
  fastify.put('/me', {
    preHandler: [authenticateToken, validateBody(userSchemas.updateProfile)],
    handler: async (request, reply) => {
      const userId = request.user!.id;
      const { username, bio } = request.body as any;

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
        changes: Object.keys(request.body)
      });

      const response: APIResponse<Omit<AuthResponse, 'token'>> = {
        success: true,
        data: {
          user: updatedUser
        }
      };

      return reply.send(response);
    }
  });

  // Change password
  fastify.put('/change-password', {
    preHandler: [authenticateToken],
    handler: async (request, reply) => {
      const userId = request.user!.id;
      const { currentPassword, newPassword } = request.body as any;

      // Validate input
      if (!currentPassword || !newPassword) {
        throw createError('Current password and new password are required', 400, 'INVALID_INPUT');
      }

      if (newPassword.length < 8) {
        throw createError('New password must be at least 8 characters long', 400, 'INVALID_INPUT');
      }

      // Get user with password hash
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw createError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isCurrentPasswordValid) {
        throw createError('Current password is incorrect', 400, 'INVALID_CREDENTIALS');
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 10);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash: newPasswordHash
        }
      });

      log.info('🔐 User password changed successfully', {
        userId: user.id
      });

      return reply.send({
        success: true,
        message: 'Password changed successfully'
      });
    }
  });
}
