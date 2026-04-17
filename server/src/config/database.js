const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

// Keep Neon DB connection warm — prevents cold-start delays
// Runs a lightweight query every 4 minutes to avoid connection timeout
const KEEP_ALIVE_INTERVAL = 4 * 60 * 1000; // 4 minutes
setInterval(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    // Silent — connection will be re-established on next real query
  }
}, KEEP_ALIVE_INTERVAL);

module.exports = prisma;
