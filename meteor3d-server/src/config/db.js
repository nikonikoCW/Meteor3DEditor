const mongoose = require('mongoose');

/**
 * MongoDB 数据库连接配置
 */
const connectDB = async () => {
    try {
        const conn = await mongoose.connect('mongodb://root:123456@127.0.0.1:27017/meteor3d', {
            authSource: 'admin'
        });

        console.log(`MongoDB 连接成功: ${conn.connection.host}`);
    } catch (error) {
        console.error(`MongoDB 连接失败: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
