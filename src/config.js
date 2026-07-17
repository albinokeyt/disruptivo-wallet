export const config = {
  port: Number(process.env.PORT || 8080),
  databaseUrl: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5544/disruptivo_wallet',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6479',
  adminUser: process.env.ADMIN_USER || 'admin',
  adminPass: process.env.ADMIN_PASS || '',
  appBaseUrl: (process.env.APP_BASE_URL || '').replace(/\/+$/, ''),
}
