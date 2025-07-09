import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { prisma } from '@fragrance-battle/database';
import { User } from '@fragrance-battle/types';

export interface Context {
  req: FastifyRequest;
  res: FastifyReply;
  user: Omit<User, 'passwordHash'> | null;
}

export async function createContext({
  req,
  res,
}: {
  req: FastifyRequest;
  res: FastifyReply;
}): Promise<Context> {
  // Get user from auth token
  const user = await getUserFromRequest(req);

  return {
    req,
    res,
    user,
  };
}

async function getUserFromRequest(req: FastifyRequest): Promise<Omit<User, 'passwordHash'> | null> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return null;
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      return null;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

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

    return user;
  } catch (error) {
    // Invalid token or other error
    return null;
  }
}
