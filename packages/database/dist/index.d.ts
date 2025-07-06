import { PrismaClient } from '@prisma/client';
declare global {
    var __prisma: PrismaClient | undefined;
}
export declare const prisma: PrismaClient<import(".prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
export * from '@prisma/client';
export declare const connectDatabase: () => Promise<void>;
export declare const disconnectDatabase: () => Promise<void>;
export declare const checkDatabaseHealth: () => Promise<boolean>;
export declare const executeTransaction: <T>(fn: (prisma: PrismaClient) => Promise<T>) => Promise<T>;
export declare const seedUsers: () => Promise<void>;
export declare const seedFragrances: () => Promise<void>;
export declare const cleanupDatabase: () => Promise<void>;
export default prisma;
//# sourceMappingURL=index.d.ts.map