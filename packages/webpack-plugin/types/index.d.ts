import { CodeOptions } from 'code-inspector-core';
interface Options extends CodeOptions {
    close?: boolean;
    output: string;
}
declare class WebpackCodeInspectorPlugin {
    options: Options;
    constructor(options: Options);
    apply(compiler: any): Promise<void>;
}
/**
 * 这个插件的主要功能和工作流程如下：

1. 配置处理：
  - 接受用户配置选项，包括是否关闭插件、输出路径等
  - 支持开发环境的判断和控制

2. Loader 注入：
  - 通过 applyLoader 函数注入自定义的 loader
  - 处理不同类型的文件（.vue、.jsx、.tsx、.js、.ts 等）
  - 支持 pre-loader 和 post-loader 的配置

3. HTML 注入：
  - 在构建过程中通过 replaceHtml 函数向 HTML 文件注入检查代码
  - 在 HTML 的 head 标签中插入必要的脚本

4. 构建优化：
  - 处理 Webpack 的文件系统缓存
  - 支持多入口文件的处理
  - 提供源码映射支持

5. 开发体验：
  - 只在开发环境中运行
  - 支持热更新
  - 提供灵活的配置选项
 */
export default WebpackCodeInspectorPlugin;
