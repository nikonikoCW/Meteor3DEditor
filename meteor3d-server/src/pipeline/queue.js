/**
 * Bull 任务队列配置
 * 用于异步处理资产流水线
 */
const Queue = require('bull');
const redisConfig = require('../config/redis');

const assetQueue = new Queue('asset-processing', {
    redis: {
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password
    },
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,  // 保留最近 100 个完成的任务
        removeOnFail: 50        // 保留最近 50 个失败的任务
    }
});

// 队列事件监听
assetQueue.on('completed', (job, result) => {
    console.log(`[Pipeline] 任务完成: ${job.id}`);
});

assetQueue.on('failed', (job, err) => {
    console.error(`[Pipeline] 任务失败: ${job.id}`, err.message);
});

assetQueue.on('error', (error) => {
    console.error('[Pipeline] 队列错误:', error);
});

module.exports = assetQueue;
