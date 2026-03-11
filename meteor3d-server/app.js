require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const connectDB = require('./src/config/db');
const sceneRoutes = require('./src/routes/sceneRoutes');
const assetRoutes = require('./src/routes/assetRoutes');
const appRoutes = require('./src/routes/appRoutes');
const chatRoutes = require('./src/routes/chatRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// 连接数据库
connectDB();

// 初始化资产处理流水线
require('./src/pipeline');

// 中间件
app.use(cors()); // 允许跨域请求
app.use(bodyParser.json({ limit: '50mb' })); // 解析 JSON 请求体，增加限制以支持大型场景
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// 静态文件服务 - 提供上传文件的访问
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 路由
app.use('/api/scene', sceneRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/app', appRoutes);
app.use('/api/chat', chatRoutes);

// 根路由
app.get('/', (req, res) => {
    res.json({ message: 'Meteor3D 后端服务运行中' });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
});

module.exports = app;
