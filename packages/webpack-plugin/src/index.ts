import {
  CodeOptions,
  RecordInfo,
  fileURLToPath,
  getCodeWithWebComponent,
  isDev,
} from 'code-inspector-core';
import path, { dirname } from 'path';
import { getWebpackEntrys } from './entry';

let compatibleDirname = '';

if (typeof __dirname !== 'undefined') {
  compatibleDirname = __dirname;
} else {
  compatibleDirname = dirname(fileURLToPath(import.meta.url));
}

let isFirstLoad = true;

interface LoaderOptions extends CodeOptions {
  record: RecordInfo;
}

/**
 * 向 Webpack 配置中注入自定义 loader
 * @param options - loader 的配置选项
 * @param compiler - Webpack compiler 实例
 */
const applyLoader = (options: LoaderOptions, compiler: any) => {
  // 防止重复注入 loader
  if (!isFirstLoad) {
    return;
  }
  isFirstLoad = false;
  // 适配不同版本的 webpack compiler 对象
  // 某些版本的 webpack 可能会将 compiler 包装在一个对象中， Vue CLI 会在 compiler 外包装一层
  const _compiler = compiler?.compiler || compiler;

  // 获取 webpack 配置中的 module 配置
  // 兼容 webpack 4 (module.loaders) 和 webpack 5 (module.rules)
  const module = _compiler?.options?.module;
  const rules = module?.rules || module?.loaders || [];

  // 处理 include 选项，确保它是数组格式
  // include 选项是用来指定哪些文件或目录需要被 loader 处理的。
  let include = options.include || [];
  if (!Array.isArray(include)) {
    include = [include];
  }

  // 向 webpack 配置中添加新的规则
  rules.push(
     // 1. 【规则1】主要的代码处理 loader
     // 这个规则是默认的全局匹配，会处理项目中所有符合条件的文件（除了 node_modules）。
    {
      // 匹配需要处理的文件类型，使用用户配置或默认值
      test: options?.match ?? /\.(vue|jsx|tsx|js|ts|mjs|mts)$/,
      exclude: /node_modules/,
      use: [
        {
           // 使用自定义的 loader
          loader: path.resolve(compatibleDirname, `./loader.js`),
          // 传递配置选项到 loader
          options,
        },
      ],
      // 根据配置决定是否使用 pre loader
      ...(options.enforcePre === false ? {} : { enforce: 'pre' }),
    },
    // 2. 【规则2】处理特定包含文件的规则
    // 这个规则是专门处理 include 指定的文件，即使这些文件在 node_modules 中也会被处理。
    ...include.map(condition => {
      return {
        resource: {
          // 同时满足用户指定的条件和文件类型匹配
          and: [condition, /\.(vue|jsx|tsx|js|ts|mjs|mts)$/],
        },
        use: [
          {
            loader: path.resolve(compatibleDirname, `./loader.js`),
            options,
          },
        ],
         // 同样根据配置决定是否使用 pre loader
        ...(options.enforcePre === false ? {} : { enforce: 'pre' }),
      }
    }),
    // 3. 【规则3】注入相关的处理规则
    {
      ...(options?.injectTo
        ? { resource: options?.injectTo }
        : {
            test: /\.(jsx|tsx|js|ts|mjs|mts)$/,
            exclude: /node_modules/,
          }),
      use: [
        {
          // 使用注入专用的 loader
          loader: path.resolve(compatibleDirname, `./inject-loader.js`),
          options,
        },
      ],
      // 设置为 post loader，确保在其他 loader 之后执行
      enforce: 'post',
    }
  );

  /**
   * 1、规则1和规则2（pre loader）：这两个规则都使用 ./loader.js， 由于设置了 enforce: 'pre'，会最先执行， 主要负责源代码的初始处理和转换
   * 2、其他 Webpack 配置中的普通 loader：比如 babel-loader、vue-loader 等， 在 pre 和 post loader 之间执行
   * 3、规则3（post loader）：使用 ./inject-loader.js，设置了 enforce: 'post'，最后执行， 负责在处理完的代码中注入额外的功能
   * 
   * 这种设计确保了：
   *  - 代码先经过必要的预处理（规则1和2）
   *  - 然后经过常规的 Webpack 转换
   *  - 最后注入所需的额外功能（规则3）
   */
};

interface Options extends CodeOptions {
  close?: boolean;
  output: string;
}


/**
 * 在 HTML 文件中注入代码检查器的客户端代码
 * 
 * 这个方法的工作流程是：
 * 1、首先从 Webpack 的 assets 对象中筛选出所有的 HTML 文件
 * 2、如果找到 HTML 文件，则使用 getCodeWithWebComponent 生成需要注入的代码检查器客户端代码
 * 3、遍历每个 HTML 文件，在其 <head> 标签后插入生成的代码
 * 4、更新 Webpack 的 assets 对象，包含修改后的 HTML 内容
 * 
 * 这个方法在整个插件中的作用是确保代码检查器的客户端代码被正确注入到最终输出的 HTML 文件中，使得在浏览器中能够正常运行代码检查功能。
 * 
 * @param {Object} params - 输入参数对象
 * @param {Options} params.options - 插件配置选项
 * @param {RecordInfo} params.record - 记录信息，包含入口文件、输出路径等
 * @param {Object} params.assets - Webpack 的资源对象，包含所有待输出的文件
 */
async function replaceHtml({
  options,
  record,
  assets,
}: {
  options: Options;
  record: RecordInfo;
  assets: { [filename: string]: any };
}) {
  // 找出所有的 HTML 文件
  const files = Object.keys(assets).filter((name) => /\.html$/.test(name));
  if (files.length) {
    // 生成需要注入的代码检查器客户端代码
    // getCodeWithWebComponent 会生成包含 Web Component 的代码
    const code = await getCodeWithWebComponent({
      // 设置导入客户端的方式
      options: { ...options, importClient: 'code' },
      // 主文件名
      file: 'main.js',
      // 初始代码为空
      code: '',
      // 传入记录信息
      record,
      // 启用注入模式
      inject: true,
    });

    // 遍历所有 HTML 文件，注入生成的代码
    files.forEach((filename: string) => {
       // 获取 HTML 文件的源代码
      const source = assets[filename]?.source?.();
      if (typeof source === 'string') {
        // 在 <head> 标签后注入生成的代码
        // 使用 type="module" 确保代码作为 ES 模块执行
        const sourceCode = source.replace(
          '<head>',
          `<head><script type="module">\n${code}\n</script>`
        );
        // 更新资源对象中的文件内容
        assets[filename] = {
          // 返回更新后的源代码
          source: () => sourceCode,
          // 返回更新后的文件大小
          size: () => sourceCode.length,
        };
      }
    });
  }
}

class WebpackCodeInspectorPlugin {
  options: Options;

  constructor(options: Options) {
    this.options = options;
  }

  async apply(compiler) {
    isFirstLoad = true;

    // 检查是否需要关闭插件或非开发环境
    if (
      this.options.close ||
      !isDev(
        this.options.dev,
        compiler?.options?.mode === 'development' ||
          process.env.NODE_ENV === 'development'
      )
    ) {
      return;
    }

    // 处理文件系统缓存，确保每次构建都是最新的
    if (compiler?.options?.cache?.type === 'filesystem') {
      compiler.options.cache.version = `code-inspector-${Date.now()}`;
    }

    // 记录构建相关信息
    const record: RecordInfo = {
      port: 0,
      entry: '',
      output: this.options.output,
      inputs: getWebpackEntrys(
        compiler?.options?.entry,
        compiler?.options?.context
      ),
    };

    // 应用自定义 loader
    applyLoader({ ...this.options, record }, compiler);

    // 在构建完成前注入检查代码
    if (compiler?.hooks?.emit) {
      const options = this.options;
      compiler.hooks.emit.tapAsync(
        'WebpackCodeInspectorPlugin',
        async (compilation, cb) => {
          const { assets = {} } = compilation;
          await replaceHtml({
            options,
            record,
            assets,
          });
          cb();
        }
      );
    }
  }
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
