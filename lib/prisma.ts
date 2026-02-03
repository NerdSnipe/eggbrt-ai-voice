import { PrismaClient } from '@prisma/client';

// PrismaClient singleton to avoid multiple instances in serverless
// This is critical for Vercel edge functions to avoid cold start timeouts

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    // Add connection pool settings optimized for serverless
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Graceful shutdown
export async function disconnect() {
  await prisma.$disconnect();
}
