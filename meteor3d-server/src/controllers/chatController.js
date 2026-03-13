const { GoogleGenerativeAI } = require("@google/generative-ai");
const SceneObject = require('../models/SceneObject');

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
    "如果用户意图明确，直接调用工具；如果需要参数但不明确，可以结合常理补全。",
    "当你需要了解当前场景中有哪些物体、它们的名称和位置等信息时，你应该主动调用 query_scene_objects 工具进行查询，然后根据查询结果回答用户或执行后续操作。",
    "不要猜测场景中有什么物体，务必先查询再回答。"
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
        },
        {
            name: "create_flow_line",
            description: "在 3D 场景中绘制一条流动线/路线，可以用来展示行走路径、巡检路线、导航路线等。需要提供路径上的坐标点列表。",
            parameters: {
                type: "OBJECT",
                properties: {
                    points: {
                        type: "ARRAY",
                        items: {
                            type: "OBJECT",
                            properties: {
                                x: { type: "NUMBER", description: "X 坐标" },
                                y: { type: "NUMBER", description: "Y 坐标（高度）" },
                                z: { type: "NUMBER", description: "Z 坐标" }
                            },
                            required: ["x", "y", "z"]
                        },
                        description: "路径点坐标数组，至少2个点"
                    },
                    textureUrl: { type: "STRING", description: "线条纹理图片地址，默认'http://localhost:3003/assets/jiantou2.png'" },
                    width: { type: "NUMBER", description: "线条宽度，默认2.0" },
                    speed: { type: "NUMBER", description: "流动速度，默认1.0" },
                    color: { type: "STRING", description: "线条颜色描述，如 'blue'、'red'、'green'，默认蓝色" }
                },
                required: ["points"]
            }
        },
        {
            name: "remove_flow_lines",
            description: "清除场景中所有的流动线/路线",
            parameters: {
                type: "OBJECT",
                properties: {},
                required: []
            }
        },
        {
            name: "query_scene_objects",
            description: "查询当前 3D 场景中的所有物体信息，包括名称、类型、坐标位置等。当你需要了解场景中有什么物体、某个物体在哪儿、有多少个某类物体时，必须先调用此工具。",
            parameters: {
                type: "OBJECT",
                properties: {},
                required: []
            }
        }
    ]
}];

const model = genAI.getGenerativeModel({
    model: "gemini-3.1-flash-lite-preview",
});

/**
 * 服务端工具集合：这些工具由后端直接执行，结果返回给 AI 继续推理
 */
const SERVER_SIDE_TOOLS = new Set(['query_scene_objects']);

/**
 * 执行服务端工具
 */
async function executeServerTool(toolName, toolArgs, context) {
    switch (toolName) {
        case 'query_scene_objects': {
            const { sceneId } = context;
            if (!sceneId) {
                return { error: '未提供 sceneId，无法查询场景物体' };
            }
            const objects = await SceneObject.find({ sceneId });
            // 只返回 AI 需要的摘要信息，节省 Token
            const summary = objects.map(obj => ({
                name: obj.name || '未命名',
                type: obj.type,
                position: obj.position,
                rotation: obj.rotation,
                scale: obj.scale,
                uuid: obj.id,
                createdAt: obj.createdAt,
                visible: obj.visible
            }));
            return {
                objectCount: summary.length,
                objects: summary
            };
        }
        default:
            return { error: `未知的服务端工具: ${toolName}` };
    }
}

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
    const { messages, sessionId, sceneId } = req.body;
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
            systemInstruction: { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
            history: session.history
        });

        // ===== Agent Loop (全程非流式，确保 function call history 正确) =====
        const MAX_LOOP = 5;
        let loopCount = 0;
        let finalText = "";
        const allClientToolCalls = [];
        let pendingFunctionCalls = [];

        // 第一轮：发送用户消息
        console.log(`[Agent Loop] 发送用户消息`);
        const firstResult = await chat.sendMessage(lastUserMsg);
        const firstResponse = firstResult.response;

        const firstCalls = firstResponse.functionCalls();
        if (firstCalls && firstCalls.length > 0) {
            pendingFunctionCalls = firstCalls;
        } else {
            finalText = firstResponse.text() || "";
            if (finalText) {
                res.write(`data: ${JSON.stringify({ type: "text", chunk: finalText })}\n\n`);
            }
        }

        // Agent Loop：持续处理函数调用
        while (pendingFunctionCalls.length > 0 && loopCount < MAX_LOOP) {
            loopCount++;

            // 分离服务端工具和客户端工具
            const serverCalls = pendingFunctionCalls.filter(fc => SERVER_SIDE_TOOLS.has(fc.name));
            const clientCalls = pendingFunctionCalls.filter(fc => !SERVER_SIDE_TOOLS.has(fc.name));

            // 客户端工具 → 推送给前端
            for (const fc of clientCalls) {
                allClientToolCalls.push(fc);
                console.log(`[Agent Loop #${loopCount}] 前端工具: ${fc.name}`);
                res.write(`data: ${JSON.stringify({
                    type: "tool_call",
                    functionName: fc.name,
                    args: fc.args
                })}\n\n`);
            }

            // 没有服务端工具 → 结束循环
            if (serverCalls.length === 0) break;

            // 服务端工具 → 执行并回传给 AI
            const functionResponses = [];
            for (const fc of serverCalls) {
                console.log(`[Agent Loop #${loopCount}] 服务端工具: ${fc.name}`);
                const result = await executeServerTool(fc.name, fc.args, { sceneId });
                console.log(`[Agent Loop #${loopCount}] 查询结果: ${JSON.stringify(result).substring(0, 100)}...`);
                functionResponses.push({
                    functionResponse: {
                        name: fc.name,
                        response: result
                    }
                });
            }

            console.log(`[Agent Loop #${loopCount}] 回传 functionResponse`);
            const nextResult = await chat.sendMessage(functionResponses);
            const nextResponse = nextResult.response;

            // 检查 AI 是否返回了更多函数调用
            const nextCalls = nextResponse.functionCalls();
            if (nextCalls && nextCalls.length > 0) {
                pendingFunctionCalls = nextCalls;
                continue;
            }

            // AI 返回了文本
            const responseText = nextResponse.text();
            if (responseText) {
                finalText = responseText;
                res.write(`data: ${JSON.stringify({ type: "text", chunk: responseText })}\n\n`);
            }
            pendingFunctionCalls = []; // 结束循环
        }

        // 更新历史记录
        appendHistory(session, "user", lastUserMsg);
        if (allClientToolCalls.length > 0) {
            const toolSummaries = allClientToolCalls.map(fc => `${fc.name}(${JSON.stringify(fc.args)})`);
            appendHistory(session, "model", `[系统执行]: ${toolSummaries.join(' → ')}`);
        }
        if (finalText) {
            appendHistory(session, "model", finalText);
        }

        res.write(`data: [DONE]\n\n`);
        res.end();

    } catch (error) {
        console.error("Gemini Agent Loop 失败:", error.message);
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
