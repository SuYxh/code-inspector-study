import type { CodeOptions, RecordInfo } from '../shared';
/**
 * 创建本地服务器
 * @param {Function} callback - 服务器启动成功后的回调函数，接收端口号作为参数
 * @param {CodeOptions} [options] - 插件配置选项
 *   @param {Object} [options.hooks] - 钩子函数
 *     @param {Function} [options.hooks.afterInspectRequest] - 点击元素后、打开 IDE 前的钩子
 *   @param {string} [options.editor] - 编辑器类型（vscode、webstorm 等）
 *   @param {string} [options.openIn] - 打开方式（tab、window 等）
 *   @param {string} [options.pathFormat] - 路径格式化方式
 */
export declare function createServer(callback: (port: number) => any, options?: CodeOptions): void;
/**
 * 启动服务器的入口函数
 * @param {CodeOptions} options - 插件配置选项
 * @param {RecordInfo} record - 记录对象，用于存储服务器状态
 *   @param {number} [record.port] - 服务器端口号
 *   @param {Promise<number>} [record.findPort] - 查找端口的 Promise
 * @returns {Promise<void>}
 *
 * 主要功能：
 * 1. 确保服务器只启动一次
 * 2. 使用 Promise 处理异步端口查找
 * 3. 缓存已找到的端口号
 */
export declare function startServer(options: CodeOptions, record: RecordInfo): Promise<void>;
