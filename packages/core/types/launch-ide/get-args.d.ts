/**
 * 根据格式规则格式化文件路径和位置信息
 * @param file 文件路径
 * @param line 行号
 * @param column 列号
 * @param format 格式化规则
 * @returns 格式化后的参数数组
 */
export declare function formatOpenPath(file: string, line: string | number, column: string | number, format: string | string[] | boolean): string[];
/**
 * 获取启动编辑器所需的命令行参数
 * @param params 参数对象
 *   - processName: 编辑器进程名称（如 'code', 'sublime', 'vim' 等）
 *   - fileName: 要打开的文件路径
 *   - lineNumber: 光标定位行号
 *   - colNumber: 光标定位列号
 *   - workspace: 工作空间路径（可选）
 *   - openWindowParams: 窗口打开方式（'-r': 复用窗口, '-n': 新窗口）
 *   - pathFormat: 自定义路径格式化规则（可选）
 * @returns 格式化后的命令行参数数组
 *
 * @example
 * VSCode 示例
 * getArguments({
 *   processName: 'code',
 *   fileName: '/path/to/file.js',
 *   lineNumber: 10,
 *   colNumber: 5,
 *   workspace: '/path/to/workspace',
 *   openWindowParams: '-r'
 * })
 * 返回: ['/path/to/workspace', '-g', '-r', '/path/to/file.js:10:5']
 *
 * Vim 示例
 * getArguments({
 *   processName: 'vim',
 *   fileName: '/path/to/file.js',
 *   lineNumber: 10,
 *   colNumber: 5
 * })
 * 返回: ['+call cursor(10, 5)', '/path/to/file.js']
 */
export declare function getArguments(params: {
    processName: string;
    fileName: string;
    lineNumber: string | number;
    colNumber: string | number;
    workspace: string | null;
    openWindowParams: string;
    pathFormat?: string | string[];
}): string[];
