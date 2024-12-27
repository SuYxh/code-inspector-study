/**
 * 主要用于在构建过程中对不同类型的前端文件进行代码检查和转换。
 * @param {string} content - 源文件的内容
 * @returns {Promise<string>} 转换后的代码内容
 *
 * @description
 * 这个 loader 支持以下文件类型的处理：
 * 1. JSX/TSX 文件
 * 2. Vue 单文件组件（包括其中的 JSX/TSX 脚本）
 * 3. 普通的 Vue 文件
 * 4. Svelte 文件
 *
*/
export default function WebpackCodeInspectorLoader(content: string): Promise<string>;
