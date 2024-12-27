import {
  transformCode,
  normalizePath,
  CodeOptions,
  getCodeWithWebComponent,
  RecordInfo,
  isJsTypeFile,
  isDev,
  matchCondition,
  getMappingFilePath,
} from 'code-inspector-core';
const PluginName = 'vite-code-inspector-plugin';

interface Options extends CodeOptions {
  close?: boolean;
  output: string;
}

const jsxParamList = ['isJsx', 'isTsx', 'lang.jsx', 'lang.tsx'];

export function ViteCodeInspectorPlugin(options: Options) {
  // 记录插件运行时的关键信息
  const record: RecordInfo = {
    // 服务端口
    port: 0,
    // 入口文件
    entry: '',
    // 输出路径
    output: options.output,
  };
  return {
    name: PluginName,
    // 配置插件执行顺序，默认为 pre（在其他插件之前执行，确保代码检查和转换在其他插件处理之前完成
    ...(options.enforcePre === false ? {} : { enforce: 'pre' as 'pre' }),

    /**
     * @description: 判断插件是否应该被应用
     * 执行时机：插件加载时最先执行
     * 作用：决定插件是否被启用
     * 返回 true 时插件生效，返回 false 时插件被跳过
     * @param {*} _
     * @param {*} param2
     * @return {*}
     */
    apply(_, { command }) {
      return !options?.close && isDev(options.dev, command === 'serve');
    },

    /**
     * @description: 转换代码
     * 执行时机：在每个模块被加载时执行
     * 触发条件：当 Vite 处理任何源文件时都会调用
     * 执行顺序：由于设置了 enforce: 'pre'，会在其他插件之前执行
     * 作用：对文件内容进行转换，注入客户端代码或处理路径
     * 
     * 文件处理顺序：
     * 1. 先判断是否为 node_modules 文件
     * 2. 然后根据文件扩展名和参数判断文件类型
     * 3. 最后根据文件类型进行相应的代码转换
     * @param {*} code
     * @param {*} id
     * @return {*}
     */
    async transform(code, id) {
      // 处理 node_modules 中的文件
      if (id.match('node_modules')) {
        if (!matchCondition(options.include || [], id)) {
          return code;
        }
      } else {
        // 对非 node_modules 文件，注入客户端代码并启动服务
        code = await getCodeWithWebComponent({
          options,
          file: id,
          code,
          record,
        });
      }

      const { escapeTags = [], mappings } = options || {};

      // 处理文件路径
      const [_completePath] = id.split('?', 2); // 当前文件的绝对路径
      let filePath = normalizePath(_completePath);
      filePath = getMappingFilePath(filePath, mappings);
      const params = new URLSearchParams(id);

      // 检查文件是否匹配配置的正则表达式，仅对符合正则的生效
      if (options?.match && !options.match.test(filePath)) {
        return code;
      }

      // 确定文件类型
      let fileType = '';
      if (
        isJsTypeFile(filePath) ||
        (filePath.endsWith('.vue') &&
          (jsxParamList.some((param) => params.get(param) !== null) ||
            params.get('lang') === 'tsx' ||
            params.get('lang') === 'jsx'))
      ) {
        // jsx 代码
        fileType = 'jsx';
      } else if (
        filePath.endsWith('.vue') &&
        params.get('type') !== 'style' &&
        params.get('raw') === null
      ) {
        // vue 代码
        fileType = 'vue';
      } else if (filePath.endsWith('.svelte')) {
        // svelte 代码
        fileType = 'svelte';
      }

      // 根据文件类型转换代码
      if (fileType) {
        return transformCode({
          content: code,
          filePath,
          fileType,
          escapeTags,
        });
      }

      return code;
    },

    /**
     * @description: 追加到 html 中，适配 MPA 项目
     * 执行时机：在处理 HTML 文件时执行
     * 触发条件：当 Vite 处理 HTML 文件时会调用
     * 执行顺序：在其他插件之后执行
     * 作用：将客户端代码注入到 HTML 中
     * @param {*} html
     * @return {*}
     */
    // 追加到 html 中，适配 MPA 项目
    async transformIndexHtml(html) {
      // 获取需要注入的客户端代码
      const code = await getCodeWithWebComponent({
        options: { ...options, importClient: 'code' },
        file: 'main.js',
        code: '',
        record,
        inject: true,
      });

      // 将代码注入到 HTML 的 head 标签中
      return html.replace(
        '<head>',
        `<head><script type="module">\n${code}\n</script>`
      );
    },
  };
}
