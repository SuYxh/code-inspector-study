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
export declare function getWebpackEntrys(entry: Entry, context: string): Promise<string[]>;
export {};
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
