import { PrismaClient } from '@prisma/client';

// Create a global variable to store the Prisma client
declare global {
  var __prisma: PrismaClient | undefined;
}

// Create the Prisma client instance
export const prisma = globalThis.__prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// In development, store the client in a global variable to prevent hot-reload issues
if (process.env.NODE_ENV === 'development') {
  globalThis.__prisma = prisma;
}

// Export types from Prisma client
export * from '@prisma/client';

// Utility functions
export const connectDatabase = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
};

export const disconnectDatabase = async () => {
  try {
    await prisma.$disconnect();
    console.log('✅ Database disconnected successfully');
  } catch (error) {
    console.error('❌ Database disconnection failed:', error);
    throw error;
  }
};

// Health check function
export const checkDatabaseHealth = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('❌ Database health check failed:', error);
    return false;
  }
};

// Transaction utility
export const executeTransaction = async <T>(
  fn: (prisma: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>
): Promise<T> => {
  return await prisma.$transaction(fn);
};

// Seeding utilities
export const seedUsers = async () => {
  // This will be implemented in the seed file
  console.log('Seeding users...');
};

export const seedFragrances = async () => {
  // This will be implemented in the seed file
  console.log('Seeding fragrances...');
};

// Clean up function for tests
export const cleanupDatabase = async () => {
  if (process.env.NODE_ENV === 'test') {
    await prisma.aICategorFeedback.deleteMany();
    await prisma.battleItem.deleteMany();
    await prisma.battle.deleteMany();
    await prisma.collectionItem.deleteMany();
    await prisma.collection.deleteMany();
    await prisma.fragrance.deleteMany();
    await prisma.user.deleteMany();
  }
};

// Default export
export default prisma;
