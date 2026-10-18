import { PrismaClient } from '@prisma/client';
import mysql from 'mysql2/promise';
import type { Pool } from 'mysql2/promise';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var __mysqlPool: Pool | undefined;
}

const DEFAULT_HOST = '195.35.53.99'; // Direct IPv4 of srv977.hstgr.io to prevent IPv6 Access Denied
const DEFAULT_PORT = 3306;
const DEFAULT_USER = 'u663560985_hjwut';
const DEFAULT_PASSWORD = 'SenditMorocco2026@Hostinger!';
const DEFAULT_DATABASE = 'u663560985_vC9mY';

function cleanSecret(val?: string | null): string {
  if (!val) return '';
  let s = val.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

/**
 * Clean & normalize host: Hostinger containers do not run MySQL on IPv6 localhost (::1)
 * and srv977.hstgr.io routes over IPv6 inside Hostinger's network, which triggers
 * "Access denied for user 'u663560985_hjwut'@'2a02:...' (using password: YES)".
 * By connecting to the direct IPv4 195.35.53.99, it forces an IPv4 connection which
 * matches the u663560985_hjwut@% grant!
 */
function normalizeHost(host?: string | null): string {
  if (!host) return DEFAULT_HOST;
  const clean = host.trim().toLowerCase();
  if (
    clean === 'localhost' ||
    clean === '127.0.0.1' ||
    clean === '::1' ||
    clean === '[::1]' ||
    clean === 'srv977.hstgr.io'
  ) {
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
      const rawUser = cleanSecret(decodeURIComponent(parsed.username || DEFAULT_USER));
      const rawPassword = cleanSecret(decodeURIComponent(parsed.password || DEFAULT_PASSWORD));
      const user = rawUser === 'root' ? DEFAULT_USER : rawUser;
      const password = user === DEFAULT_USER ? DEFAULT_PASSWORD : (rawPassword || DEFAULT_PASSWORD);
      const database = parsed.pathname ? parsed.pathname.replace(/^\//, '') : DEFAULT_DATABASE;
      const port = parsed.port ? parseInt(parsed.port, 10) : DEFAULT_PORT;

      return {
        host,
        port,
        user,
        password,
        database: database || DEFAULT_DATABASE,
        ssl: undefined,
      };
    } catch {
      // Fallback to individual env vars
    }
  }

  const host = normalizeHost(process.env.DB_HOST);
  const rawUser = cleanSecret(process.env.DB_USER) || DEFAULT_USER;
  const rawPassword = cleanSecret(process.env.DB_PASSWORD) || DEFAULT_PASSWORD;
  const user = rawUser === 'root' ? DEFAULT_USER : rawUser;
  const password = user === DEFAULT_USER ? DEFAULT_PASSWORD : (rawPassword || DEFAULT_PASSWORD);
  const database = cleanSecret(process.env.DB_NAME) || DEFAULT_DATABASE;
  const port = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : DEFAULT_PORT;

  return {
    host,
    port,
    user,
    password,
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

