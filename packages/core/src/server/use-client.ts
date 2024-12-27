import path, { isAbsolute, dirname } from 'path';
import fs from 'fs';
import chalk from 'chalk';
import { startServer } from './server';
import type { CodeOptions, RecordInfo } from '../shared';
import {
  PathName,
  isJsTypeFile,
  getFilePathWithoutExt,
  fileURLToPath,
  AstroToolbarFile,
  getIP,
  getDenpendencies,
  normalizePath,
} from '../shared';

let compatibleDirname = '';

if (typeof __dirname !== 'undefined') {
  compatibleDirname = __dirname;
} else {
  compatibleDirname = dirname(fileURLToPath(import.meta.url));
}

// 这个路径是根据打包后来的
// 1、源代码位置：客户端代码在 packages/core/src/client/index.ts 中定义（包含 CodeInspectorComponent 类）
// 2、构建过程：： 项目构建时，客户端代码会被打包成 client.umd.js， 用 UMD 格式确保代码可以在不同环境中运行（浏览器、Node.js等）
// 3、读取过程：
//  插件运行时，通过 fs.readFileSync 读取编译后的 client.umd.js 文件
//  这个文件包含了所有客户端所需的代码，包括 Web Component 的定义
// 4、注入过程： getWebComponentCode 返回的代码中，会通过 script.textContent 将 client.umd.js 的内容注入到页面中

// 所以整个流程是：
//  1、客户端代码（client/index.ts）→
//  2、构建成 UMD 文件（client.umd.js）→
//  3、插件读取文件内容（jsClientCode）→
//  4、注入到目标页面中
// 这样设计的好处是：
//  1、客户端代码可以独立开发和测试
//  2、通过构建过程优化和压缩代码
//  3、运行时动态注入，不影响原有代码
export const clientJsPath = path.resolve(compatibleDirname, './client.umd.js');
const jsClientCode = fs.readFileSync(clientJsPath, 'utf-8');


/**
 * 生成需要注入到目标文件中的客户端代码
 * @param {CodeOptions} options - 插件配置选项
 * @param {number} port - 本地服务器端口号
 * @returns {string} 处理后的注入代码
 */
export function getInjectedCode(options: CodeOptions, port: number) {
  // 添加 'use client' 指令，用于支持 React Server Components
  let code = `'use client';`;
  // 注入用于消除控制台警告的代码
  code += getEliminateWarningCode();
  //如果配置了隐藏路径属性，注入相关代码
  if (options?.hideDomPathAttr) {
    code += getHidePathAttrCode();
  }

  // 注入 Web Component 相关代码
  // code += getWebComponentCode(options, port);
  code += getWebComponentCode(options, port);


  // 添加 eslint 禁用注释并移除所有换行符
  return `/* eslint-disable */\n` + code.replace(/\n/g, '');
}

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
export function getWebComponentCode(options: CodeOptions, port: number) {
  const {
    // 快捷键配置
    hotKeys = ['shiftKey', 'altKey'],
    // 是否显示切换按钮
    showSwitch = false,
    // 是否隐藏控制台警告
    hideConsole = false,
    // 是否自动切换
    autoToggle = true,
    // 其他行为配置
    behavior = {},
    // 是否显示 IP 地址
    ip = false,
  } = options || ({} as CodeOptions);
  const { locate = true, copy = false } = behavior;

  // 返回立即执行函数，用于注入 Web Component
  return `
;(function (){
  if (typeof window !== 'undefined') {
    if (!document.documentElement.querySelector('code-inspector-component')) {
      var script = document.createElement('script');
      script.setAttribute('type', 'text/javascript');
      script.textContent = ${`${jsClientCode}`};
  
      var inspector = document.createElement('code-inspector-component');
      inspector.port = ${port};
      inspector.hotKeys = '${(hotKeys ? hotKeys : [])?.join(',')}';
      inspector.showSwitch = !!${showSwitch};
      inspector.autoToggle = !!${autoToggle};
      inspector.hideConsole = !!${hideConsole};
      inspector.locate = !!${locate};
      inspector.copy = ${typeof copy === 'string' ? `'${copy}'` : !!copy};
      inspector.ip = '${getIP(ip)}';
      document.documentElement.append(inspector);
    }
  }
})();
`;
}

/**
 * 生成用于消除控制台警告的代码
 * @returns {string} 消除警告的代码
 */
export function getEliminateWarningCode() {
  return `
  ;(function(){
    if (typeof globalThis === 'undefined' || globalThis.__code_inspector_console) {
      return;
    };
    var path = "${PathName}";
    globalThis.__code_inspector_console = true;
    var wrappers = [
      {
        type: 'error',
        origin: console.error,
      },
      {
        type: 'warn',
        origin: console.warn,
      },
    ];
    wrappers.forEach(wrapper => {
      console[wrapper.type] = function () {
        var args = Array.prototype.slice.call(arguments) || [];
        var hasVueWarning = typeof args[0] === 'string' && args[0].indexOf(path) !== -1; /* compatible for vue warning */
        if (hasVueWarning) {
          return;
        }
        var hasNextWarning = typeof args[1] === 'string' && args[1].indexOf(path) !== -1; /* compatible for nextjs hydrate */
        if (hasNextWarning) {
          return;
        }
        var hasNextWarningV15 = typeof args[2] === 'string' && args[2].indexOf(path) !== -1; /* compatible for nextjs(v15.0.0+) hydrate */
        if (hasNextWarningV15) {
          return;
        }
        wrapper.origin.apply(null, args);
      };
    });
  })();
  `;
}

/**
 * 生成用于隐藏路径属性的代码
 * @returns {string} 隐藏路径属性的代码
 */
export function getHidePathAttrCode() {
  return `
  ;(function(){
    if (typeof window === 'undefined' || window.__code_inspector_observed) {
      return;
    };
    function observe() {
      document.querySelectorAll("[${PathName}]").forEach((node) => {
        node["${PathName}"] = node.getAttribute("${PathName}");
        node.removeAttribute("${PathName}");
      });
      setTimeout(observe, 1000);
    }
    observe();
    window.__code_inspector_observed = true;
  })();
  `;
}

// normal entry file
function recordEntry(record: RecordInfo, file: string) {
  if (!record.entry && isJsTypeFile(file)) {
    // exclude svelte kit server entry file
    if (file.includes('/.svelte-kit/')) {
      return;
    }
    // exclude nextjs layout entry
    if (file.replace(path.extname(file), '').endsWith('/app/layout')) {
      return;
    }
    record.entry = getFilePathWithoutExt(file);
  }
}

// target file to inject code
async function isTargetFileToInject(file: string, record: RecordInfo) {
  const inputs: string[] = await (record.inputs || []);
  return (
    (isJsTypeFile(file) && getFilePathWithoutExt(file) === record.entry) ||
    file === AstroToolbarFile ||
    record.injectTo?.includes(normalizePath(file)) ||
    inputs?.includes(normalizePath(file))
  );
}

function recordInjectTo(record: RecordInfo, options: CodeOptions) {
  if (options?.injectTo) {
    const injectTo = Array.isArray(options.injectTo)
      ? options.injectTo
      : [options.injectTo];
    injectTo.forEach((injectToPath) => {
      if (!isAbsolute(injectToPath)) {
        console.log(
          chalk.cyan('injectTo') +
            chalk.red(' in ') +
            chalk.cyan('code-inspector-plugin') +
            chalk.red('must be an absolute file path!')
        );
      } else if (!isJsTypeFile(injectToPath)) {
        console.log(
          chalk.red('The ext of ') +
            chalk.cyan('injectTo') +
            chalk.red(' in ') +
            chalk.cyan('code-inspector-plugin') +
            chalk.red('must in .js/.ts/.mjs/.mts/.jsx/.tsx')
        );
      }
    });
    record.injectTo = (injectTo || []).map(file => normalizePath(file));
  }
}

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
export async function getCodeWithWebComponent({
  options,
  record,
  file,
  code,
  inject = false,
}: {
  options: CodeOptions;
  record: RecordInfo;
  file: string;
  code: string;
  inject?: boolean;
}) {
  // 启动本地服务器
  await startServer(options, record);

  // 记录需要注入代码的文件路径
  recordInjectTo(record, options);
  // 记录入口文件
  recordEntry(record, file);

  // 注入消除 warning 代码， 判断是否需要注入代码
  const isTargetFile = await isTargetFileToInject(file, record);

  // 如果需要注入，则根据项目类型选择注入方式：
  // Next.js 项目：生成独立文件并通过 import 引入
  // 普通项目：直接在代码中注入
  if (isTargetFile  || inject) {
    const injectCode = getInjectedCode(options, record.port);
    if (isNextjsProject() || options.importClient === 'file') {
      // 生成 .eslintrc.js 配置文件
      writeEslintRcFile(record.output);
      // 生成独立文件并通过 import 引入
      const webComponentNpmPath = writeWebComponentFile(
        record.output,
        injectCode,
        record.port
      );
      if (!file.match(webComponentNpmPath)) {
        code = `import '${webComponentNpmPath}';${code}`;
      }
    } else {
      // 直接在代码中注入
      code = `${injectCode};${code}`;
    }
  }
  return code;
}

function writeEslintRcFile(targetPath: string) {
  const eslintFilePath = path.resolve(targetPath, './.eslintrc.js');
  if (!fs.existsSync(eslintFilePath)) {
    const content = `
module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 6
  },
}
`;
    fs.writeFileSync(eslintFilePath, content, 'utf-8');
  }
}

function writeWebComponentFile(
  targetPath: string,
  content: string,
  port: number
) {
  const webComponentFileName = `append-code-${port}.js`;
  const webComponentNpmPath = `code-inspector-plugin/dist/${webComponentFileName}`;
  const webComponentFilePath = path.resolve(targetPath, webComponentFileName);
  fs.writeFileSync(webComponentFilePath, content, 'utf-8');
  return webComponentNpmPath;
}

function isNextjsProject() {
  const dependencies = getDenpendencies();
  return dependencies.includes('next');
}
