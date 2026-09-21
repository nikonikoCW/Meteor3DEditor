const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://root:123456@127.0.0.1:27017/meteor3d';
// const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:Admin123456@127.0.0.1:27017/meteor3d';

/**
 * MongoDB 数据库连接配置
 */
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(MONGODB_URI, {
            authSource: 'admin'
        });

        console.log(`MongoDB 连接成功: ${conn.connection.host}`);
    } catch (error) {
        console.error(`MongoDB 连接失败: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
