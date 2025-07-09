import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { prisma } from '@fragrance-battle/database';
import { User } from '@fragrance-battle/types';

// Extend Fastify Request interface to include user
declare module 'fastify' {
  interface FastifyRequest {
    user?: Omit<User, 'passwordHash'>;
  }
}

export interface JWTPayload {
  userId: string;
  email: string;
  username: string;
  iat?: number;
  exp?: number;
}

export class AuthError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'AuthError';
  }
}

export const authenticateToken = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const authHeader = request.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      throw new AuthError('Access token required', 401, 'UNAUTHORIZED');
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      throw new AuthError('JWT secret not configured', 500, 'CONFIG_ERROR');
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      throw new AuthError('User not found', 401, 'UNAUTHORIZED');
    }

    // Attach user to request
    request.user = user;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthError('Invalid token', 401, 'INVALID_TOKEN');
    } else if (error instanceof jwt.TokenExpiredError) {
      throw new AuthError('Token expired', 401, 'TOKEN_EXPIRED');
    } else if (error instanceof AuthError) {
      throw error;
    } else {
      throw new AuthError('Authentication failed', 500, 'AUTH_ERROR');
    }
  }
};

export const optionalAuth = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const authHeader = request.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return; // No token provided, continue without user
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      return; // No JWT secret configured, continue without user
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (user) {
      request.user = user;
    }
  } catch (error) {
    // Don't fail if optional auth fails, just continue without user
    return;
  }
};

export const requireAuth = (request: FastifyRequest, reply: FastifyReply) => {
  if (!request.user) {
    throw new AuthError('Authentication required', 401, 'UNAUTHORIZED');
  }
};

export const generateToken = (user: { id: string; email: string; username: string }): string => {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    throw new Error('JWT secret not configured');
  }

  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    username: user.username
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};
