/**
 * 轻量级消息通知工具（无框架依赖）
 * 用于在没有 Vue 环境时提供简单的消息通知功能
 */

// 全局消息状态（普通对象，供外部观察者订阅）
const state = {
    messages: [],
    listeners: []
};

let messageId = 0;

/**
 * 通知所有监听者状态变化
 */
function notifyListeners() {
    state.listeners.forEach(fn => fn([...state.messages]));
}

/**
 * 显示消息
 * @param {string} content - 消息内容
 * @param {string} type - 消息类型: success, error, warning, info
 * @param {number} duration - 显示时长(ms)，0 表示不自动关闭
 */
function showMessage(content, type = 'info', duration = 3000) {
    const id = messageId++;
    const message = {
        id,
        content,
        type,
        visible: true
    };

    state.messages.push(message);
    notifyListeners();

    // 自动关闭
    if (duration > 0) {
        setTimeout(() => {
            closeMessage(id);
        }, duration);
    }

    // 同时输出到控制台（用于调试）
    const consoleMethod = type === 'error' ? 'error' : type === 'warning' ? 'warn' : 'log';
    console[consoleMethod](`[Meteor3D ${type.toUpperCase()}]`, content);

    return id;
}

/**
 * 关闭消息
 * @param {number} id - 消息ID
 */
function closeMessage(id) {
    const index = state.messages.findIndex(m => m.id === id);
    if (index > -1) {
        state.messages.splice(index, 1);
        notifyListeners();
    }
}

/**
 * 关闭所有消息
 */
function closeAll() {
    state.messages = [];
    notifyListeners();
}

/**
 * 订阅消息变化
 * @param {Function} listener - 监听函数
 * @returns {Function} 取消订阅的函数
 */
function subscribe(listener) {
    state.listeners.push(listener);
    return () => {
        const index = state.listeners.indexOf(listener);
        if (index > -1) state.listeners.splice(index, 1);
    };
}

// 导出便捷方法
export const message = {
    success(content, duration = 3000) {
        return showMessage(content, 'success', duration);
    },

    error(content, duration = 3000) {
        return showMessage(content, 'error', duration);
    },

    warning(content, duration = 4000) {
        return showMessage(content, 'warning', duration);
    },

    info(content, duration = 3000) {
        return showMessage(content, 'info', duration);
    },

    close(id) {
        closeMessage(id);
    },

    closeAll() {
        closeAll();
    },

    subscribe(listener) {
        return subscribe(listener);
    }
};

// 导出状态供组件使用
export const messageState = state;
