const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

const CHAT_API_KEY = process.env.CHAT_API_KEY;
function requireApiKey(req, res, next) {
    const key = req.headers['x-api-key'];
    if (!CHAT_API_KEY || !key || key !== CHAT_API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

// 基础文本对话接口 (非流式)
router.post('/', requireApiKey, chatController.handleChat);

// 流式 SSE 接口 (支持 Function Calling 实时打字输出)
router.post('/stream', requireApiKey, chatController.handleChatStream);

module.exports = router;
