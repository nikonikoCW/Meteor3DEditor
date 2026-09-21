const SYSTEM_PROMPT = [
    '你是 Meteor3D 应用中的 AI 大脑，也是当前 3D 场景的智能控制中枢。',
    '请使用简洁、自然、准确的中文回答用户；如果用户使用其他语言，则使用相同语言回答。',
    '不确定的信息要明确说明，不要编造事实。',
    '不要猜测场景中有哪些对象。涉及具体对象时，先调用 query_scene_objects 获取 BID；需要坐标时，再调用 query_object_details。',
    '取得 BID 后，控制工具优先传 bid，不要仅依赖模糊名称。',
    '用户要求控制天气、高亮、描边、相机、性能面板或流动线时，直接调用对应工具。',
    '流动线的 textureUrl 属于用户输入；用户没有提供时应先询问，不要虚构 URL。',
    '只有收到工具成功结果后才能向用户确认操作成功。'
].join('\n');

const tools = [
    {
        type: 'function',
        function: {
            name: 'control_weather',
            description: '控制当前 3D 场景的下雪、下雨或清除天气',
            parameters: {
                type: 'object',
                properties: {
                    type: { type: 'string', enum: ['snow', 'rain', 'clear'] },
                    enabled: { type: 'boolean' },
                    intensity: { type: 'number', description: '粒子数量，默认 10000' }
                },
                required: ['type', 'enabled']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'highlight_asset',
            description: '启用或取消场景对象的高亮发光效果。优先传 BID，也兼容对象名称。',
            parameters: {
                type: 'object',
                properties: {
                    bid: { type: 'string', description: '对象的稳定 BID' },
                    target: { type: 'string', description: '对象名称，无法取得 BID 时使用' },
                    enabled: { type: 'boolean' }
                },
                required: ['enabled']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'outline_asset',
            description: '启用或取消场景对象的轮廓描边。优先传 BID，也兼容对象名称。',
            parameters: {
                type: 'object',
                properties: {
                    bid: { type: 'string' },
                    target: { type: 'string' },
                    enabled: { type: 'boolean' }
                },
                required: ['enabled']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'control_camera',
            description: "聚焦场景对象或回到全景。回到全景时 target 传 'overview'。",
            parameters: {
                type: 'object',
                properties: {
                    bid: { type: 'string' },
                    target: { type: 'string' }
                }
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'toggle_performance_stats',
            description: '开启或关闭 3D 帧率性能监控面板',
            parameters: {
                type: 'object',
                properties: { enabled: { type: 'boolean' } },
                required: ['enabled']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'create_flow_line',
            description: '在 3D 场景中创建流动路线，至少需要两个三维坐标点',
            parameters: {
                type: 'object',
                properties: {
                    points: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                x: { type: 'number' },
                                y: { type: 'number' },
                                z: { type: 'number' }
                            },
                            required: ['x', 'y', 'z']
                        }
                    },
                    textureUrl: { type: 'string', description: '流动线纹理 URL，必须由用户指定' },
                    width: { type: 'number' },
                    speed: { type: 'number' },
                    color: { type: 'string' }
                },
                required: ['points', 'textureUrl']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'remove_flow_lines',
            description: '清除当前场景中的所有流动路线',
            parameters: { type: 'object', properties: {} }
        }
    },
    {
        type: 'function',
        function: {
            name: 'query_scene_objects',
            description: '查询场景对象的名称和 BID 树。操作具体对象前应先调用此工具。',
            parameters: { type: 'object', properties: {} }
        }
    },
    {
        type: 'function',
        function: {
            name: 'query_object_details',
            description: '根据 BID 查询对象的位置、旋转和缩放信息',
            parameters: {
                type: 'object',
                properties: {
                    bids: { type: 'array', items: { type: 'string' } }
                },
                required: ['bids']
            }
        }
    }
];

const SERVER_SIDE_TOOLS = new Set(['query_scene_objects', 'query_object_details']);

function executeServerTool(toolName, args, sceneData) {
    if (!sceneData) return { success: false, error: '前端未提供场景数据' };

    if (toolName === 'query_scene_objects') {
        const stripDetails = (node) => ({
            name: node.name,
            bid: node.bid || node.userData?.bid || node.uuid || '',
            children: (node.children || []).map(stripDetails)
        });
        return { success: true, scene: stripDetails(sceneData) };
    }

    if (toolName === 'query_object_details') {
        const bids = args.bids || args.uuids || [];
        const bidSet = new Set(bids);
        const objects = [];
        const walk = (node) => {
            const bid = node.bid || node.userData?.bid || node.uuid;
            if (bidSet.has(bid)) {
                objects.push({
                    name: node.name,
                    bid,
                    position: node.position,
                    rotation: node.rotation,
                    scale: node.scale
                });
            }
            (node.children || []).forEach(walk);
        };
        walk(sceneData);
        return { success: true, found: objects.length, objects };
    }

    return { success: false, error: `未知的服务端工具: ${toolName}` };
}

module.exports = { SYSTEM_PROMPT, tools, SERVER_SIDE_TOOLS, executeServerTool };
