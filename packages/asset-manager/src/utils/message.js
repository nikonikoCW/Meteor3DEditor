import { reactive } from 'vue';

// 全局消息状态
const state = reactive({
    messages: []
});

let messageId = 0;

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

    // 自动关闭
    if (duration > 0) {
        setTimeout(() => {
            closeMessage(id);
        }, duration);
    }

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
    }
}

/**
 * 关闭所有消息
 */
function closeAll() {
    state.messages = [];
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
    }
};

// 导出状态供组件使用
export const messageState = state;
