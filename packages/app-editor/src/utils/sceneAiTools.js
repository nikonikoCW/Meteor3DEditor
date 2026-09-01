function toVectorData(vector) {
    if (!vector) return undefined;
    return { x: vector.x, y: vector.y, z: vector.z };
}

export function buildSceneSnapshot(instance) {
    const scene = instance?._internal?.sceneManager?.scene;
    if (!scene) return null;

    const traverse = (object) => ({
        name: object.name || object.type,
        bid: object.userData?.bid || '',
        position: toVectorData(object.position),
        rotation: toVectorData(object.rotation),
        scale: toVectorData(object.scale),
        children: (object.children || []).map(traverse)
    });
    return traverse(scene);
}

function getSceneObjects(instance) {
    const registeredObjects = instance?._internal?.sceneManager?.objects;
    if (Array.isArray(registeredObjects) && registeredObjects.length > 0) {
        return registeredObjects;
    }

    const root = instance?._internal?.sceneManager?.scene;
    const objects = [];
    root?.traverse?.((object) => objects.push(object));
    return objects;
}

function resolveTarget(instance, args) {
    const objects = getSceneObjects(instance);
    if (args.bid) {
        const byBid = objects.find(object => object.userData?.bid === args.bid);
        if (byBid) return byBid;
    }

    const targetName = String(args.target || '').trim().toLowerCase();
    if (!targetName) return null;
    return objects.find(object => String(object.name || '').toLowerCase().includes(targetName)) || null;
}

function requireTarget(instance, args) {
    const target = resolveTarget(instance, args);
    if (!target) throw new Error(`未找到场景对象: ${args.bid || args.target || '未指定'}`);
    const bid = target.userData?.bid;
    if (!bid) throw new Error(`场景对象缺少 BID: ${target.name || args.target}`);
    return { target, bid };
}

export async function executeSceneTool(instance, functionName, args = {}) {
    if (!instance) throw new Error('3D 场景尚未加载完成');

    switch (functionName) {
        case 'control_weather': {
            const intensity = Number.isFinite(args.intensity) ? args.intensity : 10000;
            if (args.type === 'snow') {
                instance.setSnow(args.enabled !== false, { count: intensity });
                instance.setRain(false);
            } else if (args.type === 'rain') {
                instance.setRain(args.enabled !== false, { count: intensity });
                instance.setSnow(false);
            } else {
                instance.setSnow(false);
                instance.setRain(false);
            }
            return { weather: args.type, enabled: args.type === 'clear' ? false : args.enabled !== false };
        }

        case 'highlight_asset': {
            const { bid, target } = requireTarget(instance, args);
            if (args.enabled !== false) {
                instance.enableHighlight(bid, { color: 0x00ff00, intensity: 1 });
            } else {
                instance.disableHighlight(bid);
            }
            return { bid, name: target.name, enabled: args.enabled !== false };
        }

        case 'outline_asset': {
            const { bid, target } = requireTarget(instance, args);
            if (args.enabled !== false) {
                instance.enableOutline(bid, { color: 0xffff00, thickness: 2 });
            } else {
                instance.disableOutline(bid);
            }
            return { bid, name: target.name, enabled: args.enabled !== false };
        }

        case 'control_camera': {
            if (String(args.target || '').toLowerCase() === 'overview') {
                instance.fitCameraToScene();
                return { target: 'overview' };
            }
            const { bid, target } = requireTarget(instance, args);
            instance.setView({ target: toVectorData(target.position) });
            return { bid, name: target.name };
        }

        case 'toggle_performance_stats': {
            if (args.enabled) instance.enableStats();
            else instance.disableStats();
            return { enabled: Boolean(args.enabled) };
        }

        case 'create_flow_line': {
            if (!Array.isArray(args.points) || args.points.length < 2) {
                throw new Error('流动线至少需要两个坐标点');
            }
            if (!args.textureUrl) throw new Error('流动线缺少 textureUrl');
            const points = args.points.map(point => ({
                x: Number(point.x),
                y: Number(point.y),
                z: Number(point.z)
            }));
            if (!points.every(point => Object.values(point).every(Number.isFinite))) {
                throw new Error('流动线坐标无效');
            }
            instance.clearLines();
            const lineId = instance.createLine({
                points,
                textureUrl: args.textureUrl,
                width: Number.isFinite(args.width) ? args.width : 2,
                speed: Number.isFinite(args.speed) ? args.speed : 1,
                repeat: 10,
                opacity: 0.9
            });
            if (!lineId) throw new Error('流动线创建失败');
            return { lineId, pointCount: points.length };
        }

        case 'remove_flow_lines':
            instance.clearLines();
            return { removed: true };

        default:
            throw new Error(`不支持的客户端场景工具: ${functionName}`);
    }
}
