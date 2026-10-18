import { PrismaClient } from '@prisma/client';
import mysql from 'mysql2/promise';
import type { Pool } from 'mysql2/promise';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var __mysqlPool: Pool | undefined;
}

const DEFAULT_HOST = 'srv977.hstgr.io';
const DEFAULT_PORT = 3306;
const DEFAULT_USER = 'u663560985_hjwut';
const DEFAULT_PASSWORD = 'SenditMorocco2026@Hostinger!';
const DEFAULT_DATABASE = 'u663560985_vC9mY';

/**
 * Clean & normalize host: Hostinger containers do not run MySQL on IPv6 localhost (::1).
 * If host is localhost, 127.0.0.1, ::1 or empty, always route to Hostinger's MySQL host srv977.hstgr.io.
 */
function normalizeHost(host?: string | null): string {
  if (!host) return DEFAULT_HOST;
  const clean = host.trim().toLowerCase();
  if (clean === 'localhost' || clean === '127.0.0.1' || clean === '::1' || clean === '[::1]') {
    return DEFAULT_HOST;
  }
  return host.trim();
}

/**
 * 1. Parse MySQL connection details from DATABASE_URL or individual DB_* env variables
 */
export function getDbConfig() {
  const url = process.env.DATABASE_URL || '';
  if (url && url.startsWith('mysql://')) {
    try {
      const parsed = new URL(url);
      const host = normalizeHost(parsed.hostname);
      const user = decodeURIComponent(parsed.username || DEFAULT_USER);
      const password = decodeURIComponent(parsed.password || DEFAULT_PASSWORD);
      const database = parsed.pathname ? parsed.pathname.replace(/^\//, '') : DEFAULT_DATABASE;
      const port = parsed.port ? parseInt(parsed.port, 10) : DEFAULT_PORT;

      return {
        host,
        port,
        user: user === 'root' ? DEFAULT_USER : user,
        password: password || DEFAULT_PASSWORD,
        database: database || DEFAULT_DATABASE,
        ssl: undefined,
      };
    } catch {
      // Fallback to individual env vars
    }
  }

  const host = normalizeHost(process.env.DB_HOST);
  const user = process.env.DB_USER ? process.env.DB_USER.trim() : DEFAULT_USER;
  const password = process.env.DB_PASSWORD ? process.env.DB_PASSWORD.trim() : DEFAULT_PASSWORD;
  const database = process.env.DB_NAME ? process.env.DB_NAME.trim() : DEFAULT_DATABASE;
  const port = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : DEFAULT_PORT;

  return {
    host,
    port,
    user: user === 'root' ? DEFAULT_USER : user,
    password: password || DEFAULT_PASSWORD,
    database: database || DEFAULT_DATABASE,
    ssl: undefined,
  };
}

export function getNormalizedDatabaseUrl(): string {
  const config = getDbConfig();
  const encodedUser = encodeURIComponent(config.user);
  const encodedPass = encodeURIComponent(config.password);
  return `mysql://${encodedUser}:${encodedPass}@${config.host}:${config.port}/${config.database}`;
}

/**
 * 2. Singleton Prisma Client with dynamic Hostinger MySQL URL
 */
const resolvedDbUrl = getNormalizedDatabaseUrl();
process.env.DATABASE_URL = resolvedDbUrl;

export const prisma =
  global.__prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: resolvedDbUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

/**
 * 3. Direct MySQL Connection Pool (mysql2)
 */
export function getMysqlPool(): Pool {
  if (!global.__mysqlPool) {
    const config = getDbConfig();
    console.log(`[Hostinger MySQL Pool] Initializing pool to ${config.user}@${config.host}:${config.port}/${config.database}`);
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

