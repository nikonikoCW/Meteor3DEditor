const { GoogleGenerativeAI } = require("@google/generative-ai");

// 初始化 Gemini
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error("致命错误: 未在环境变量中找到 GEMINI_API_KEY。请在 .env 文件中配置。");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const SYSTEM_PROMPT = [
    "你是园区 3D 场景控制中枢也是一个全能的智能助手。",
    "你可以和用户进行闲聊，并友好、自然地回答用户的任何问题。",
    "在涉及 3D 场景操作（如天气、高亮、运镜、性能统计等）时，你必须调用对应的系统工具函数来完成用户的空间操作意图。",
    "如果用户意图明确，直接调用工具；如果需要参数但不明确，可以结合常理补全。"
].join("");

const tools = [{
    functionDeclarations: [
        {
            name: "control_weather",
            description: "控制 3D 场景中的天气系统，如下雪或下雨",
            parameters: {
                type: "OBJECT",
                properties: {
                    type: { type: "STRING", enum: ["snow", "rain", "clear"], description: "天气类型：雪、雨或晴天(清除天气)" },
                    enabled: { type: "BOOLEAN", description: "是否启用该天气" },
                    intensity: { type: "NUMBER", description: "天气强度（可选），如下雪量、雨量，默认10000" }
                },
                required: ["type", "enabled"]
            }
        },
        {
            name: "highlight_asset",
            description: "高亮场景中的特定楼宇或设备（发光效果）",
            parameters: {
                type: "OBJECT",
                properties: {
                    target: { type: "STRING", description: "要高亮的物体名称，如'一号楼'、'变压器'" },
                    enabled: { type: "BOOLEAN", description: "启用或取消高亮" }
                },
                required: ["target", "enabled"]
            }
        },
        {
            name: "outline_asset",
            description: "给场景中的特定物体添加发光的轮廓描边",
            parameters: {
                type: "OBJECT",
                properties: {
                    target: { type: "STRING", description: "要描边的物体名称" },
                    enabled: { type: "BOOLEAN", description: "启用或取消描边" }
                },
                required: ["target", "enabled"]
            }
        },
        {
            name: "control_camera",
            description: "控制三维空间相机的运镜、聚焦或重置全局视角",
            parameters: {
                type: "OBJECT",
                properties: {
                    target: { type: "STRING", description: "要聚焦的物体名，如果是回到全局/总览/初始视角，传 'overview'" }
                },
                required: ["target"]
            }
        },
        {
            name: "toggle_performance_stats",
            description: "开启或关闭前端的 3D 帧率性能监控面板",
            parameters: {
                type: "OBJECT",
                properties: {
                    enabled: { type: "BOOLEAN", description: "是否开启性能监视器" }
                },
                required: ["enabled"]
            }
        }
    ]
}];

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
            tools,
            history: session.history
        });

        const resultChunkStream = await chat.sendMessageStream(lastUserMsg);

        let fullText = "";
        let functionCallResult = null;

        for await (const chunk of resultChunkStream.stream) {
            const calls = chunk.functionCalls();
            if (calls && calls.length > 0) {
                functionCallResult = calls[0];
                break;
            }

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

        if (functionCallResult) {
            const toolSummary = `[内置系统执行反馈]: 已帮你执行了 3D 空间动作 ${functionCallResult.name}，参数: ${JSON.stringify(functionCallResult.args)}。当前场景已发生相应变化。`;
            appendHistory(session, "model", toolSummary);
            console.log(`[Meteor3D Stream Session ${id}] Gemini 函数调用: ${functionCallResult.name}`);
            res.write(`data: ${JSON.stringify({
                type: "tool_call",
                functionName: functionCallResult.name,
                args: functionCallResult.args
            })}\n\n`);
        } else {
            appendHistory(session, "model", fullText);
            console.log(`[Meteor3D Stream Session ${id}] Gemini 文本回复完成`);
        }

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
