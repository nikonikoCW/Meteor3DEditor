const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// 基础文本对话接口 (非流式)
router.post('/', chatController.handleChat);

// 流式 SSE 接口 (支持 Function Calling 实时打字输出)
router.post('/stream', chatController.handleChatStream);

// AI 大脑执行客户端场景工具后的真实结果回执
router.post('/tools/:toolCallId/result', chatController.handleToolResult);

// 清空指定 AI 大脑的服务端会话历史
router.delete('/sessions/:sessionId', chatController.clearSession);

module.exports = router;
