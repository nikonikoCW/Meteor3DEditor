const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// 基础文本对话接口 (非流式)
router.post('/', chatController.handleChat);

// 流式 SSE 接口 (支持 Function Calling 实时打字输出)
router.post('/stream', chatController.handleChatStream);

module.exports = router;
