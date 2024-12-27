import type { CodeOptions, RecordInfo } from '../shared';
export declare const clientJsPath: string;
/**
 * 生成需要注入到目标文件中的客户端代码
 * @param {CodeOptions} options - 插件配置选项
 * @param {number} port - 本地服务器端口号
 * @returns {string} 处理后的注入代码
 */
export declare function getInjectedCode(options: CodeOptions, port: number): string;
/**
 * 生成 Web Component 相关的代码
 * getWebComponentCode 方法本身并不是直接创建 Web Component，它只是生成一段注入代码，这段代码会：
 *  1. 创建一个 script 标签，注入客户端代码（jsClientCode）
 *  2. 创建并配置 code-inspector-component 元素
 *
 * 真正的 Web Component 是通过 CodeInspectorComponent（packages/core/src/client/index.ts） 类实现的
 *
 *
 * 工作流程是：
 * 1. getWebComponentCode 生成的代码会被注入到页面中
 * 2. 注入的代码会创建 code-inspector-component 元素
 * 3. 由于已经通过 jsClientCode 注册了 Web Component（CodeInspectorComponent 类），浏览器会使用这个类来处理 code-inspector-component 元素
 * 4. Web Component 开始工作，监听用户交互，实现代码定位功能
 *
 * 所以 getWebComponentCode 更像是一个"引导程序"，真正的 Web Component 功能是由 CodeInspectorComponent 类实现的。这种设计可以：
 * - 保持代码的模块化
 * - 避免污染全局作用域
 * - 利用 Web Component 的封装特性
 * - 确保功能的独立性和可复用性
 *
 * @param {CodeOptions} options - 插件配置选项
 * @param {number} port - 本地服务器端口号
 * @returns {string} Web Component 代码
 */
export declare function getWebComponentCode(options: CodeOptions, port: number): string;
/**
 * 生成用于消除控制台警告的代码
 * @returns {string} 消除警告的代码
 */
export declare function getEliminateWarningCode(): string;
/**
 * 生成用于隐藏路径属性的代码
 * @returns {string} 隐藏路径属性的代码
 */
export declare function getHidePathAttrCode(): string;
/**
 * 处理并注入 Web Component 相关代码的核心函数
 * @param {object} params - 函数参数
 * @param {CodeOptions} params.options - 插件配置选项
 * @param {RecordInfo} params.record - 记录插件运行时的关键信息（端口、入口文件、输出路径等）
 * @param {string} params.file - 当前处理的文件路径
 * @param {string} params.code - 当前文件的源代码内容
 * @param {boolean} [params.inject=false] - 是否强制注入代码，用于 HTML 文件处理
 * @returns {Promise<string>} 处理后的代码
 *
 * 主要功能：
 * 1. 启动本地服务器，用于处理代码定位请求
 * 2. 记录需要注入代码的文件路径
 * 3. 记录项目入口文件
 * 4. 根据不同场景注入代码：
 *    - Next.js 项目：通过文件引入方式注入
 *    - 普通项目：直接在代码中注入
 * 5. 生成必要的配置文件（如 .eslintrc.js）
 */
export declare function getCodeWithWebComponent({ options, record, file, code, inject, }: {
    options: CodeOptions;
    record: RecordInfo;
    file: string;
    code: string;
    inject?: boolean;
}): Promise<string>;
