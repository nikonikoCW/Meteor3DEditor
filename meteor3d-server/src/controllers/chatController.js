const { OpenAI } = require("openai");
const SceneObject = require('../models/SceneObject');

// 初始化 Zhipu AI
const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY;

if (!ZHIPU_API_KEY) {
    console.error("致命错误: 未在环境变量中找到 ZHIPU_API_KEY。请在 .env 文件中配置。");
    process.exit(1);
}

const openai = new OpenAI({
    apiKey: ZHIPU_API_KEY,
    baseURL: "https://open.bigmodel.cn/api/paas/v4/"
});

const SYSTEM_PROMPT = [
    "你是园区 3D 场景控制中枢也是一个全能的智能助手。",
    "你可以和用户进行闲聊，并友好、自然地回答用户的任何问题。",
    "作为智能中枢，你应该尽可能独立、聪明地完成工作：如果用户给出模糊指令（例如“在两棵树之间连线”），你需要主动调用 query_scene_objects 查出对应物体的坐标，并自己构造计算必需的结构化参数（如 points）。绝不可以直接向用户索要由系统数据组成的参数（如坐标）！",
    "只有当你确实无法通过查询自动推算，并且该参数属于用户的外观主观偏好（比如：流动线的贴图 textureUrl）时，你才可以向用户提问。提问时可以说：“我已经找到了它们的位置，请问您希望这条线使用什么纹理（例如默认的箭头贴图 http://localhost:3003/assets/jiantou2.png）？”",
    "一旦所有必要参数齐全，必须立即调用系统工具执行操作，不要询问“请确认是否需要创建”这种废话，要雷厉风行。",
    "不要猜测场景中有什么物体，务必先查询再执行后续操作。"
].join("\n");

const tools = [
    {
        type: "function",
        function: {
            name: "control_weather",
            description: "控制 3D 场景中的天气系统，如下雪或下雨",
            parameters: {
                type: "object",
                properties: {
                    type: { type: "string", enum: ["snow", "rain", "clear"], description: "天气类型：雪、雨或晴天(清除天气)" },
                    enabled: { type: "boolean", description: "是否启用该天气" },
                    intensity: { type: "number", description: "天气强度（可选），如下雪量、雨量，默认10000" }
                },
                required: ["type", "enabled"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "highlight_asset",
            description: "高亮场景中的特定楼宇或设备（发光效果）",
            parameters: {
                type: "object",
                properties: {
                    target: { type: "string", description: "要高亮的物体名称，如'一号楼'、'变压器'" },
                    enabled: { type: "boolean", description: "启用或取消高亮" }
                },
                required: ["target", "enabled"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "outline_asset",
            description: "给场景中的特定物体添加发光的轮廓描边",
            parameters: {
                type: "object",
                properties: {
                    target: { type: "string", description: "要描边的物体名称" },
                    enabled: { type: "boolean", description: "启用或取消描边" }
                },
                required: ["target", "enabled"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "control_camera",
            description: "控制三维空间相机的运镜、聚焦或重置全局视角",
            parameters: {
                type: "object",
                properties: {
                    target: { type: "string", description: "要聚焦的物体名，如果是回到全局/总览/初始视角，传 'overview'" }
                },
                required: ["target"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "toggle_performance_stats",
            description: "开启或关闭前端的 3D 帧率性能监控面板",
            parameters: {
                type: "object",
                properties: {
                    enabled: { type: "boolean", description: "是否开启性能监视器" }
                },
                required: ["enabled"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "create_flow_line",
            description: "在 3D 场景中绘制一条流动线/路线，可以用来展示行走路径、巡检路线、导航路线等。需要提供路径上的坐标点列表。",
            parameters: {
                type: "object",
                properties: {
                    points: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                x: { type: "number", description: "X 坐标" },
                                y: { type: "number", description: "Y 坐标（高度）" },
                                z: { type: "number", description: "Z 坐标" }
                            },
                            required: ["x", "y", "z"]
                        },
                        description: "路径点坐标数组，至少2个点"
                    },
                    textureUrl: { type: "string", description: "线条纹理图片的URL地址。必须由用户主观指定，不要虚构。若用户没提供，请向用户询问（例如引导用户使用默认贴图 http://localhost:3003/assets/jiantou2.png 或其他链接）。" },
                    width: { type: "number", description: "线条宽度，默认2.0" },
                    speed: { type: "number", description: "流动速度，默认1.0" },
                    color: { type: "string", description: "线条颜色描述，如 'blue'、'red'、'green'，默认蓝色" }
                },
                required: ["points", "textureUrl"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "remove_flow_lines",
            description: "清除场景中所有的流动线/路线",
            parameters: {
                type: "object",
                properties: {},
                required: []
            }
        }
    },
    {
        type: "function",
        function: {
            name: "query_scene_objects",
            description: "查询当前 3D 场景中的所有物体信息，包括名称、类型、坐标位置等。当你需要了解场景中有什么物体、某个物体在哪儿、有多少个某类物体时，必须先调用此工具。",
            parameters: {
                type: "object",
                properties: {},
                required: []
            }
        }
    }
];

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
const MAX_HISTORY_ITEMS = 60;

function getSession(sessionId) {
    const id = (sessionId || "").toString().trim() || "default-session";
    if (!sessions.has(id)) {
        sessions.set(id, {
            messages: [], // 直接存储标准的 OpenAI messages 数组
            updatedAt: Date.now()
        });
    }
    const session = sessions.get(id);
    session.updatedAt = Date.now();
    return { id, session };
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

        // 追加用户的新输入
        session.messages.push({ role: "user", content: lastUserMsg });

        // 裁减历史以防超长，同时避免切断 assistant-tool 链路
        if (session.messages.length > MAX_HISTORY_ITEMS) {
            let pruneIndex = session.messages.length - 40;
            // 跳过可能被打断的工具调用流，只从 user 消息开始截断
            while (pruneIndex < session.messages.length && session.messages[pruneIndex].role !== 'user') {
                pruneIndex++;
            }
            session.messages = session.messages.slice(pruneIndex);
        }

        // 构建对话上下文 (适配 OpenAI 格式)
        const messagesToSend = [
            { role: "system", content: SYSTEM_PROMPT },
            ...session.messages
        ];

        let currentMessages = [...messagesToSend];

        // ===== Agent Loop =====
        const MAX_LOOP = 5;
        let loopCount = 0;

        while (loopCount < MAX_LOOP) {
            loopCount++;

            console.log(`[Agent Loop #${loopCount}] 调用 Zhipu GLM-4 API`);
            const response = await openai.chat.completions.create({
                model: "glm-4-flash",
                messages: currentMessages,
                tools: tools,
                tool_choice: "auto"
            });

            const choice = response.choices[0];
            const message = choice.message;
            currentMessages.push(message);
            session.messages.push(message);

            if (message.tool_calls && message.tool_calls.length > 0) {
                const serverCalls = [];
                const clientCalls = [];

                for (const toolCall of message.tool_calls) {
                    const functionName = toolCall.function.name;
                    let functionArgs = {};
                    try {
                        functionArgs = JSON.parse(toolCall.function.arguments || "{}");
                    } catch (e) {
                        console.error('解析工具参数失败:', e);
                    }

                    if (SERVER_SIDE_TOOLS.has(functionName)) {
                        serverCalls.push({ toolCall, functionName, functionArgs });
                    } else {
                        clientCalls.push({ toolCall, functionName, functionArgs });
                    }
                }

                // 客户端工具 -> 向流写入指令
                for (const fc of clientCalls) {
                    console.log(`[Agent Loop #${loopCount}] 前端工具: ${fc.functionName}`);
                    res.write(`data: ${JSON.stringify({
                        type: "tool_call",
                        functionName: fc.functionName,
                        args: fc.functionArgs
                    })}\n\n`);

                    // 标记工具已经执行完毕返回客户端，补充进对话上下文继续后面的思考
                    const toolReply = {
                        role: "tool",
                        content: JSON.stringify({ status: "客户端工具已成功推送" }),
                        tool_call_id: fc.toolCall.id
                    };
                    currentMessages.push(toolReply);
                    session.messages.push(toolReply);
                }

                // 服务端工具 -> 本地直接执行并循环再扔给模型
                if (serverCalls.length > 0) {
                    for (const sc of serverCalls) {
                        console.log(`[Agent Loop #${loopCount}] 服务端工具: ${sc.functionName}`);
                        const result = await executeServerTool(sc.functionName, sc.functionArgs, { sceneId });

                        const toolReply = {
                            role: "tool",
                            name: sc.functionName,
                            content: JSON.stringify(result),
                            tool_call_id: sc.toolCall.id
                        };
                        currentMessages.push(toolReply);
                        session.messages.push(toolReply);
                    }
                    continue; // 有服务端工具则查完就再进行下一轮思考
                }

                // 全是客户端工具的话，进行最后一次总结
                if (serverCalls.length === 0) {
                    if (message.content) {
                        res.write(`data: ${JSON.stringify({ type: "text", chunk: message.content })}\n\n`);
                    }
                    // 让大模型做最后总结，避免只输出 tool_call 没有文本安抚用户
                    const summaryResponse = await openai.chat.completions.create({
                        model: "glm-4-flash",
                        messages: currentMessages
                    });
                    const summaryMsg = summaryResponse.choices[0]?.message;
                    if (summaryMsg && summaryMsg.content) {
                        currentMessages.push(summaryMsg);
                        session.messages.push(summaryMsg);
                        res.write(`data: ${JSON.stringify({ type: "text", chunk: summaryMsg.content })}\n\n`);
                    }
                    break;
                }
            } else {
                // 没有 tool calls，直接输出纯文本
                if (message.content) {
                    res.write(`data: ${JSON.stringify({ type: "text", chunk: message.content })}\n\n`);
                }
                break;
            }
        }

        res.write(`data: [DONE]\n\n`);
        res.end();

    } catch (error) {
        console.error("Zhipu Agent Loop 失败:", error);
        res.write(`data: ${JSON.stringify({ error: error.message || error.toString() })}\n\n`);
        res.end();
    }
};

/**
 * 普通非流式接口
 */
exports.handleChat = async (req, res) => {
    res.json({ message: "请使用 /api/chat/stream 接口进行 SSE 流式对话" });
};
