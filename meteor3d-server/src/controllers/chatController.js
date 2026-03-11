const { GoogleGenerativeAI } = require("@google/generative-ai");

// 初始化 Gemini (尝试从环境变量读取，如果没有则使用默认)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyARJpMXRb1EBJH9QH-hBTYVcBwiPkB0ODg";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const SYSTEM_PROMPT = [
    "你是园区 3D 场景控制中枢也是一个全能的智能助手。",
    "你可以和用户进行闲聊，并友好、自然地回答用户的任何问题，包括常识、算术、代码等各种领域的提问。",
    "无需总是强制把话题拉回到园区管理上。尽你所能去满足用户的自然语言对话需求。"
].join("");

const model = genAI.getGenerativeModel({
    model: "gemini-flash-latest",
    systemInstruction: SYSTEM_PROMPT
});

// 会话管理 (内存中)
const sessions = new Map();
const SESSION_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_HISTORY_ITEMS = 30;

function getSession(sessionId) {
    const id = (sessionId || "").toString().trim() || "default-session";
    if (!sessions.has(id)) {
        sessions.set(id, {
            history: [],
            updatedAt: Date.now()
        });
    }
    const session = sessions.get(id);
    session.updatedAt = Date.now();
    return { id, session };
}

function appendHistory(session, role, text) {
    if (!text) return;
    session.history.push({ role, parts: [{ text }] });
    if (session.history.length > MAX_HISTORY_ITEMS) {
        session.history = session.history.slice(-MAX_HISTORY_ITEMS);
    }
}

// 自动清理过期 Session
setInterval(() => {
    const now = Date.now();
    for (const [sessionId, session] of sessions.entries()) {
        if (now - session.updatedAt > SESSION_TTL_MS) {
            sessions.delete(sessionId);
        }
    }
}, 10 * 60 * 1000);

/**
 * SSE 流式接口: 处理聊天并在接收到 chunk 时立刻返回前端
 */
exports.handleChatStream = async (req, res) => {
    const { messages, sessionId } = req.body;
    const lastUserMsg = messages?.[messages.length - 1]?.content;

    if (!lastUserMsg) {
        return res.status(400).json({ error: "messages 不能为空" });
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
        const { id, session } = getSession(sessionId || "http-stream");
        console.log(`\n[Meteor3D Stream Session ${id}] 用户: ${lastUserMsg}`);

        const chat = model.startChat({
            history: session.history
        });

        const resultChunkStream = await chat.sendMessageStream(lastUserMsg);

        let fullText = "";

        for await (const chunk of resultChunkStream.stream) {
            try {
                const textChunk = chunk.text();
                if (textChunk) {
                    fullText += textChunk;
                    res.write(`data: ${JSON.stringify({ type: "text", chunk: textChunk })}\n\n`);
                }
            } catch (e) {
                // Ignore chunk without text
            }
        }

        appendHistory(session, "user", lastUserMsg);
        appendHistory(session, "model", fullText);
        console.log(`[Meteor3D Stream Session ${id}] Gemini 文本回复完成`);

        res.write(`data: [DONE]\n\n`);
        res.end();

    } catch (error) {
        console.error("Gemini 流式调用失败:", error.message);
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
    }
};

/**
 * 普通非流式接口
 */
exports.handleChat = async (req, res) => {
    // 基础对话 API 待实现 / 备用
    res.json({ message: "请使用 /api/chat/stream 接口进行 SSE 流式对话" });
};
