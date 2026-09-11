import { PrismaClient as PgPrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

// Helper to determine whether to use external PostgreSQL (Supabase, Neon, etc.) or local SQLite
export function isPostgresDatabase(): boolean {
  const url = process.env.DATABASE_URL;
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  return trimmed.startsWith('postgresql://') || trimmed.startsWith('postgres://');
}

function createPrismaClient(): PgPrismaClient {
  if (isPostgresDatabase()) {
    return new PgPrismaClient();
  }

  // Fallback to SQLite in storage/database.sqlite
  try {
    const storageDir = path.resolve(process.cwd(), 'storage');
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    const dbPath = path.resolve(storageDir, 'database.sqlite');
    const templatePath = path.resolve(storageDir, 'database.sqlite.default');

    // If database.sqlite doesn't exist yet, restore from default template
    if (!fs.existsSync(dbPath) && fs.existsSync(templatePath)) {
      try {
        fs.copyFileSync(templatePath, dbPath);
        console.log('[prisma] Restored storage/database.sqlite from template.');
      } catch (e) {
        console.warn('[prisma] Warning copying SQLite template:', e);
      }
    }

    process.env.SQLITE_DATABASE_URL = `file:${dbPath}`;

    // Dynamically require @prisma/client-sqlite
    const { PrismaClient: SqlitePrismaClient } = require('@prisma/client-sqlite');
    return new SqlitePrismaClient({
      datasources: {
        db: {
          url: `file:${dbPath}`,
        },
      },
    }) as unknown as PgPrismaClient;
  } catch (err) {
    console.warn('[prisma] SQLite client fallback error, falling back to standard client:', err);
    return new PgPrismaClient();
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PgPrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

