/**
 * Redis 连接配置
 * 用于 Bull 任务队列
 */
require('dotenv').config();

module.exports = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || 'chenwei'
};
