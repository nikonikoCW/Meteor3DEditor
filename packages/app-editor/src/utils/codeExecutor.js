/**
 * ECharts 代码执行器
 * 在沙箱环境中执行用户代码，返回 option 对象
 */

/**
 * 执行 ECharts 代码并返回 option
 * @param {string} code - 用户代码（MakeAPie 格式）
 * @param {object} echarts - echarts 库引用
 * @returns {{ option: object|null, error: string|null }}
 */
export function executeEChartsCode(code, echarts) {
    if (!code || !code.trim()) {
        return { option: null, error: null };
    }

    try {
        // 创建沙箱函数，屏蔽危险 API
        const fn = new Function(
            'echarts',
            'setTimeout',
            'setInterval',
            'clearTimeout',
            'clearInterval',
            'fetch',
            'XMLHttpRequest',
            'eval',
            'Function',
            `
        var option = null;
        ${code}
        return option;
      `
        );

        // 执行代码，传入 undefined 屏蔽危险 API
        const result = fn(
            echarts,
            undefined, // setTimeout
            undefined, // setInterval
            undefined, // clearTimeout
            undefined, // clearInterval
            undefined, // fetch
            undefined, // XMLHttpRequest
            undefined, // eval
            undefined  // Function
        );

        return { option: result, error: null };
    } catch (error) {
        // 尝试从错误堆栈中提取行号
        const lineMatch = error.stack?.match(/<anonymous>:(\d+):(\d+)/);
        let lineInfo = '';
        if (lineMatch) {
            // 减去包装代码的行数（3行）
            const userLine = parseInt(lineMatch[1]) - 3;
            const col = lineMatch[2];
            if (userLine > 0) {
                lineInfo = ` (第 ${userLine} 行, 第 ${col} 列)`;
            }
        }



        const errorMsg = `${error.message}${lineInfo}`;
        console.error('[ECharts Executor] 代码执行错误:', errorMsg);
        console.error('[ECharts Executor] 完整堆栈:', error.stack);

        return { option: null, error: errorMsg };
    }
}

/**
 * 验证代码安全性（可选的预检查）
 * @param {string} code - 用户代码
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateCode(code) {
    const forbidden = [
        'setTimeout',
        'setInterval',
        'fetch(',
        'XMLHttpRequest',
        'eval(',
        'new Function',
        'document.',
        'window.',
        'localStorage',
        'sessionStorage'
    ];

    for (const pattern of forbidden) {
        if (code.includes(pattern)) {
            return {
                valid: false,
                error: `代码中包含不允许的 API: ${pattern}`
            };
        }
    }

    return { valid: true };
}
