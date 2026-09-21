/**
 * 历史记录管理器
 * 负责管理撤销/重做栈
 */
export class HistoryManager {
    constructor() {
        this.undoStack = [];
        this.redoStack = [];
    }

    /**
     * 执行命令并加入撤销栈
     * @param {Object} command - 要执行的命令对象
     */
    execute(command) {
        command.execute();
        this.undoStack.push(command);
        this.redoStack = []; // 执行新操作时清空重做栈
    }

    /**
     * 撤销上一步操作
     */
    undo() {
        if (this.undoStack.length === 0) return;
        const command = this.undoStack.pop();
        command.undo();
        this.redoStack.push(command);
    }

    /**
     * 重做上一步撤销的操作
     */
    redo() {
        if (this.redoStack.length === 0) return;
        const command = this.redoStack.pop();
        command.execute();
        this.undoStack.push(command);
    }
}
