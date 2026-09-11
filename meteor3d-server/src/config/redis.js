/**
 * Redis connection config for Bull task queue.
 */
require('dotenv').config();

const parseNumber = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

module.exports = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseNumber(process.env.REDIS_PORT, 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    connectTimeout: parseNumber(process.env.REDIS_CONNECT_TIMEOUT_MS, 10000),
    keepAlive: parseNumber(process.env.REDIS_KEEP_ALIVE_MS, 30000)
};
