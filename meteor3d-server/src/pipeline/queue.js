/**
 * Bull task queue config.
 * Used by the async asset processing pipeline.
 */
const Queue = require('bull');
const redisConfig = require('../config/redis');

const redisTarget = `${redisConfig.host}:${redisConfig.port}`;
const redisPasswordStatus = redisConfig.password ? 'password set' : 'no password';

console.log(`[Pipeline] Redis queue config: ${redisTarget} (${redisPasswordStatus})`);

const assetQueue = new Queue('asset-processing', {
    redis: {
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password
    },
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 50
    }
});

assetQueue.isReady()
    .then(() => {
        console.log(`[Pipeline] Redis queue connected: ${redisTarget}`);
    })
    .catch((error) => {
        console.error(`[Pipeline] Redis queue connection failed: ${redisTarget}`, error.message);
    });

assetQueue.on('completed', (job, result) => {
    console.log(`[Pipeline] task completed: ${job.id}`);
});

assetQueue.on('failed', (job, err) => {
    console.error(`[Pipeline] task failed: ${job.id}`, err.message);
});

assetQueue.on('error', (error) => {
    console.error('[Pipeline] queue error:', error);
});

module.exports = assetQueue;
