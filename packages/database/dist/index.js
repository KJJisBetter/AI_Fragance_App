"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupDatabase = exports.seedFragrances = exports.seedUsers = exports.executeTransaction = exports.checkDatabaseHealth = exports.disconnectDatabase = exports.connectDatabase = exports.prisma = void 0;
const client_1 = require("@prisma/client");
// Create the Prisma client instance
exports.prisma = globalThis.__prisma || new client_1.PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});
// In development, store the client in a global variable to prevent hot-reload issues
if (process.env.NODE_ENV === 'development') {
    globalThis.__prisma = exports.prisma;
}
// Export types from Prisma client
__exportStar(require("@prisma/client"), exports);
// Utility functions
const connectDatabase = async () => {
    try {
        await exports.prisma.$connect();
        console.log('✅ Database connected successfully');
    }
    catch (error) {
        console.error('❌ Database connection failed:', error);
        throw error;
    }
};
exports.connectDatabase = connectDatabase;
const disconnectDatabase = async () => {
    try {
        await exports.prisma.$disconnect();
        console.log('✅ Database disconnected successfully');
    }
    catch (error) {
        console.error('❌ Database disconnection failed:', error);
        throw error;
    }
};
exports.disconnectDatabase = disconnectDatabase;
// Health check function
const checkDatabaseHealth = async () => {
    try {
        await exports.prisma.$queryRaw `SELECT 1`;
        return true;
    }
    catch (error) {
        console.error('❌ Database health check failed:', error);
        return false;
    }
};
exports.checkDatabaseHealth = checkDatabaseHealth;
// Transaction utility
const executeTransaction = async (fn) => {
    return await exports.prisma.$transaction(fn);
};
exports.executeTransaction = executeTransaction;
// Seeding utilities
const seedUsers = async () => {
    // This will be implemented in the seed file
    console.log('Seeding users...');
};
exports.seedUsers = seedUsers;
const seedFragrances = async () => {
    // This will be implemented in the seed file
    console.log('Seeding fragrances...');
};
exports.seedFragrances = seedFragrances;
// Clean up function for tests
const cleanupDatabase = async () => {
    if (process.env.NODE_ENV === 'test') {
        await exports.prisma.aICategorFeedback.deleteMany();
        await exports.prisma.battleItem.deleteMany();
        await exports.prisma.battle.deleteMany();
        await exports.prisma.collectionItem.deleteMany();
        await exports.prisma.collection.deleteMany();
        await exports.prisma.fragrance.deleteMany();
        await exports.prisma.user.deleteMany();
    }
};
exports.cleanupDatabase = cleanupDatabase;
// Default export
exports.default = exports.prisma;
//# sourceMappingURL=index.js.map