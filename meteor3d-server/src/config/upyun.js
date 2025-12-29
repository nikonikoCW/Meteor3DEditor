/**
 * 又拍云配置
 * 从 .env 文件读取配置
 */
require('dotenv').config();

module.exports = {
    serviceName: process.env.UPYUN_SERVICE_NAME,
    operatorName: process.env.UPYUN_OPERATOR_NAME,
    password: process.env.UPYUN_PASSWORD,
    domain: process.env.UPYUN_DOMAIN  // https://youpaiyun.meteor3d.cn
};
