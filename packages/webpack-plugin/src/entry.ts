/**
 * https://webpack.js.org/configuration/entry-context/#entry
 */
import { normalizePath } from 'code-inspector-core';
import path from 'path';

type EntryItem = string | string[];

interface EntryDescription {
  import: EntryItem;
}

type EntryStatic = string | string[] | EntryObject;

interface EntryObject {
  [index: string]: string | string[] | EntryDescription;
}

type Entry = EntryStatic | (() => EntryStatic | Promise<EntryStatic>);


/**
 * 处理 Webpack entry 配置，将所有入口文件路径转换为绝对路径
 * 
 * 主要处理流程：
 * 首先检查入口配置是否为函数，如果是则执行获取实际配置
 * 然后根据配置类型分别处理：
 *  对象形式：遍历对象的每个属性，提取入口路径
 *  字符串或数组形式：直接处理路径
 * 最后过滤掉无效的入口（比如 node_modules 中的模块）
 * 
 * 为什么要转换成绝对路径呢？
 * 
 * 
 * @param entry Webpack 的 entry 配置，可以是以下几种形式：
 *   - string：单个入口文件路径
 *   - string[]：多个入口文件路径的数组
 *   - object：对象形式的入口配置
 *   - function：返回上述任意形式的函数
 * @param context Webpack 配置的 context 路径，用于解析相对路径
 * @returns 返回所有入口文件的绝对路径数组
 */
export async function getWebpackEntrys(
  entry: Entry,
  context: string
): Promise<string[]> {
  // 如果没有提供入口文件或上下文路径，返回空数组
  if (!entry || !context) {
    return [];
  }

  // 如果 entry 是函数，执行它获取实际的入口配置
  const staticEntry: EntryStatic =
    typeof entry === 'function' ? await entry() : entry;

  let entries: string[] = [];

  if (typeof staticEntry === 'object' && !Array.isArray(staticEntry)) {
    // 处理对象形式的入口配置
    // 例如: { main: './src/index.js' } 或 { main: { import: './src/index.js' } }
    for (const key in staticEntry) {
      const entryObject = staticEntry[key];
      // 处理 EntryDescription 形式或直接的路径配置
      const _stackEntry =
        (entryObject as EntryDescription).import ||
        (entryObject as string | string[]);
      collectEntries(entries, _stackEntry, context);
    }
  } else {
    // 处理字符串或数组形式的入口配置
    // 例如: './src/index.js' 或 ['./src/index.js', './src/other.js']
    collectEntries(entries, staticEntry, context);
  }

  // 过滤掉无效的入口（如 node_modules 中的模块）
  return entries.filter((_entry) => !!_entry);
}


/**
 * 收集并处理 Webpack 入口文件路径
 * @param entries 存储结果的数组，用于收集所有处理后的入口文件路径
 * @param staticEntry 要处理的入口配置，可以是单个路径字符串或路径字符串数组
 * @param context Webpack 的 context 路径，用于将相对路径转换为绝对路径
 * 
 * 使用示例：
 * 1. 字符串形式：
 *    collectEntries(entries, './src/index.js', '/project/root')
 *    
 * 2. 数组形式：
 *    collectEntries(entries, ['./src/index.js', './src/admin.js'], '/project/root')
 */
function collectEntries(
  entries: string[],
  staticEntry: string | string[],
  context: string
): void {
  if (typeof staticEntry === 'string') {
    // 处理单个入口文件路径
    // 将相对路径转换为绝对路径并添加到结果数组中
    // string
    entries.push(convertToAbsolutePath(staticEntry, context));
  } else if (Array.isArray(staticEntry)) {
    // string[]
    // 处理多个入口文件路径
    // 将数组中的每个路径都转换为绝对路径，然后展开添加到结果数组中
    entries.push(
      ...staticEntry.map((item) => convertToAbsolutePath(item, context))
    );
  }
}

/**
 * 将入口文件路径转换为绝对路径
 * @param entry 入口文件路径，可以是相对路径或绝对路径
 * @param context Webpack 配置的 context 路径，用于解析相对路径
 * @returns 返回转换后的绝对路径，如果是无效路径则返回空字符串
 * 
 * 使用示例：
 * 1. 绝对路径：
 *    convertToAbsolutePath('/usr/src/app/index.js', '/usr/src/app')
 *    返回: '/usr/src/app/index.js'
 * 
 * 2. 相对路径：
 *    convertToAbsolutePath('./src/index.js', '/usr/src/app')
 *    返回: '/usr/src/app/src/index.js'
 * 
 * 3. 模块路径：
 *    convertToAbsolutePath('react', '/usr/src/app')
 *    返回: ''
 */
function convertToAbsolutePath(entry: string, context: string): string {
  // 1. 处理已经是绝对路径的情况
  if (path.isAbsolute(entry)) {
    return normalizePath(entry);
  }
  
  // 2. 处理非相对路径的情况（如 node_modules 中的模块）
  if (!entry.startsWith('.')) {
    return '';
  }

  // 3. 处理相对路径，将其转换为绝对路径
  return path.resolve(context, normalizePath(entry));
}


/**
 * 为什么要转换成绝对路径呢？
 * 将入口文件路径转换为绝对路径有以下几个重要原因：
 * 1、路径解析的一致性
 *  - 在不同的执行环境下（不同的操作系统、不同的工作目录），相对路径的解析结果可能不同
 *  - 使用绝对路径可以确保在任何环境下都能准确定位到同一个文件
 *  - 避免了因路径解析不一致导致的构建错误
 * 
 * 2、文件监听和缓存
 *  - Webpack 的文件监听系统需要准确知道文件的位置
 *  - 绝对路径可以帮助 Webpack 建立稳定的文件依赖关系图
 *  - 有助于缓存系统正确工作，提高构建性能
 * 
 * 3、插件和 loader 的处理
 *  - 很多 Webpack 插件和 loader 需要准确知道文件的完整路径
 *  - 绝对路径可以避免插件在处理文件时出现路径解析错误
 *  - 便于进行源码映射（source mapping）等操作
 * 
 * 4、跨平台兼容性
 *  - Windows 和 Unix 系统的路径分隔符不同（\ vs /）
 *  - 转换为绝对路径时可以统一处理这些差异
 *  - 确保代码在不同操作系统上都能正常工作
 * 
 * 5、调试和错误追踪
 *  - 当出现错误时，绝对路径可以帮助更快地定位问题
 *  - 错误堆栈信息中的完整路径更有助于调试
 *  - 便于生成准确的源码映射
 */