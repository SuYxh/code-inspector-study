import {
  transformCode,
  normalizePath,
  parseSFC,
  isJsTypeFile,
  getMappingFilePath,
} from 'code-inspector-core';

// 用于判断文件是否包含 JSX/TSX 的参数列表
const jsxParamList = ['isJsx', 'isTsx', 'lang.jsx', 'lang.tsx'];

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
export default async function WebpackCodeInspectorLoader(content: string) {
  // 启用 Webpack loader 缓存机制
  this.cacheable && this.cacheable(true);
  // 标准化文件路径（处理不同操作系统的路径分隔符）
  let filePath = normalizePath(this.resourcePath); // 当前文件的绝对路径
  // 解析资源查询参数，例如 '?vue&type=template'
  let params = new URLSearchParams(this.resource);
  const options = this.query;
  // 解构配置选项：escapeTags（需要跳过的标签）和 mappings（文件路径映射）
  const { escapeTags = [], mappings } = options || {};
  // 获取经过映射转换后的文件路径
  filePath = getMappingFilePath(filePath, mappings);


  // 场景1：处理 JSX/TSX 文件
  // 判断是否为 JS 类型文件或带有 JSX 参数的 Vue 文件
  const isJSX =
    isJsTypeFile(filePath) ||
    (filePath.endsWith('.vue') &&
      jsxParamList.some((param) => params.get(param) !== null));
  if (isJSX) {
    return transformCode({ content, filePath, fileType: 'jsx', escapeTags });
  }

  // 场景2：处理 Vue 文件中的 JSX/TSX 脚本
  const isJsxWithScript =
    filePath.endsWith('.vue') &&
    (params.get('lang') === 'tsx' || params.get('lang') === 'jsx');
  if (isJsxWithScript) {
    // 解析 Vue 单文件组件
    const { descriptor } = parseSFC(content, {
      sourceMap: false,
    });
    // 处理 <script> 标签内容
    // 注意：.vue 允许同时存在 <script> 和 <script setup>
    const scripts = [
      descriptor.script?.content,
      descriptor.scriptSetup?.content,
    ];
    // 遍历处理每个脚本块
    for (const script of scripts) {
      if (!script) continue;
      // 转换脚本内容
      const newScript = transformCode({
        content: script,
        filePath,
        fileType: 'jsx',
        escapeTags,
      });
      // 用转换后的内容替换原始脚本
      content = content.replace(script, newScript);
    }
    return content;
  }

  // 场景3：处理普通 Vue 文件
  // 确保不是单独的样式或脚本文件，且不是原始内容
  const isVue =
    filePath.endsWith('.vue') &&
    params.get('type') !== 'style' &&
    params.get('type') !== 'script' &&
    params.get('raw') === null;
  if (isVue) {
    return transformCode({ content, filePath, fileType: 'vue', escapeTags });
  }

  // 场景4：处理 Svelte 文件
  const isSvelte = filePath.endsWith('.svelte');
  if (isSvelte) {
    return transformCode({ content, filePath, fileType: 'svelte', escapeTags });
  }

  // 如果文件类型不匹配任何处理场景，返回原始内容
  return content;
}
