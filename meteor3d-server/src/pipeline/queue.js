/**
 * Bull task queue config.
 * Used by the async asset processing pipeline.
 */
const Queue = require('bull');
const redisConfig = require('../config/redis');

const redisTarget = `${redisConfig.host}:${redisConfig.port}`;
const redisPasswordStatus = redisConfig.password ? 'password set' : 'no password';
const transientRedisErrorCodes = new Set([
    'ECONNRESET',
    'ECONNREFUSED',
    'ECONNABORTED',
    'ETIMEDOUT',
    'EPIPE',
    'ENETDOWN',
    'ENETUNREACH',
    'EHOSTUNREACH'
]);

const redisOptions = {
    host: redisConfig.host,
    port: redisConfig.port,
    connectTimeout: redisConfig.connectTimeout,
    keepAlive: redisConfig.keepAlive,
    retryStrategy(times) {
        return Math.min(times * 100, 5000);
    }
};

if (redisConfig.password) {
    redisOptions.password = redisConfig.password;
}

console.log(`[Pipeline] Redis queue config: ${redisTarget} (${redisPasswordStatus})`);

const assetQueue = new Queue('asset-processing', {
    redis: redisOptions,
    settings: {
        lockDuration: 5 * 60 * 1000,
        lockRenewTime: 60 * 1000,
        stalledInterval: 60 * 1000,
        maxStalledCount: 1
    },
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 50
    }
});

function isTransientRedisError(error) {
    return Boolean(error && transientRedisErrorCodes.has(error.code));
}

function formatRedisError(error) {
    if (!error) return 'unknown error';
    const code = error.code ? `${error.code}: ` : '';
    return `${code}${error.message || String(error)}`;
}

function watchRedisClient(type, client) {
    if (!client || client.__meteor3dQueueLogging) return;

    Object.defineProperty(client, '__meteor3dQueueLogging', {
        value: true,
        enumerable: false
    });

    client.on('connect', () => {
        console.log(`[Pipeline] Redis ${type} connected: ${redisTarget}`);
    });

    client.on('ready', () => {
        console.log(`[Pipeline] Redis ${type} ready: ${redisTarget}`);
    });

    client.on('close', () => {
        console.warn(`[Pipeline] Redis ${type} connection closed: ${redisTarget}`);
    });

    client.on('reconnecting', (delay) => {
        console.warn(`[Pipeline] Redis ${type} reconnecting in ${delay}ms: ${redisTarget}`);
    });

    client.on('end', () => {
        console.warn(`[Pipeline] Redis ${type} connection ended: ${redisTarget}`);
    });
}

watchRedisClient('client', assetQueue.client);
watchRedisClient('subscriber', assetQueue.eclient);
watchRedisClient('blocking', assetQueue.bclient);

assetQueue.isReady()
    .then(() => {
        console.log(`[Pipeline] Redis queue connected: ${redisTarget}`);
    })
    .catch((error) => {
        console.error(`[Pipeline] Redis queue connection failed: ${redisTarget}`, formatRedisError(error));
    });

assetQueue.on('completed', (job) => {
    console.log(`[Pipeline] task completed: ${job.id}`);
});

assetQueue.on('failed', (job, err) => {
    console.error(`[Pipeline] task failed: ${job.id}`, err.message);
});

assetQueue.on('stalled', (job) => {
    const jobId = job && job.id ? job.id : job;
    console.warn(`[Pipeline] task stalled: ${jobId}. Bull may retry this job.`);
});

assetQueue.on('error', (error) => {
    if (isTransientRedisError(error)) {
        console.warn(`[Pipeline] Redis queue transient error: ${formatRedisError(error)}. Bull will reconnect automatically.`);
        return;
    }

    console.error('[Pipeline] queue error:', error);
});

module.exports = assetQueue;
