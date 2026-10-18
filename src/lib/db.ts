import { PrismaClient } from '@prisma/client';
import mysql, { Pool } from 'mysql2/promise';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var __mysqlPool: Pool | undefined;
}

/**
 * 1. Singleton Prisma Client
 */
export const prisma =
  global.__prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

/**
 * 2. Parse MySQL connection details from DATABASE_URL or individual DB_* env variables
 */
export function getDbConfig() {
  const url = process.env.DATABASE_URL || '';
  if (url && url.startsWith('mysql://')) {
    try {
      const parsed = new URL(url);
      return {
        host: parsed.hostname || 'localhost',
        port: parsed.port ? parseInt(parsed.port, 10) : 3306,
        user: decodeURIComponent(parsed.username || 'root'),
        password: decodeURIComponent(parsed.password || ''),
        database: parsed.pathname ? parsed.pathname.replace(/^\//, '') : '',
        ssl: undefined,
      };
    } catch (e) {
      // Fallback to individual env vars
    }
  }

  return {
    host: process.env.DB_HOST || 'srv977.hstgr.io',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
    user: process.env.DB_USER || 'u663560985_hjwut',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'u663560985_vC9mY',
    ssl: undefined,
  };
}

/**
 * 3. Direct MySQL Connection Pool (mysql2)
 */
export function getMysqlPool(): Pool {
  if (!global.__mysqlPool) {
    const config = getDbConfig();
    global.__mysqlPool = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    });
  }
  return global.__mysqlPool;
}

/**
 * 4. Helper to execute direct parameterized SQL queries
 */
export async function executeQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const pool = getMysqlPool();
  const [rows] = await pool.execute(sql, params);
  return rows as T[];
}
