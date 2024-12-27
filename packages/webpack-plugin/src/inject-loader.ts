import { normalizePath, getCodeWithWebComponent } from 'code-inspector-core';

/**
 * Webpack loader，用于注入 web component 相关代码
 * @param content - 源文件的内容字符串
 * @param source - source map 相关信息
 * @param meta - 文件的元数据信息
 */
export default async function WebpackCodeInjectLoader(
  content: string,
  source: any,
  meta: any
) {
  // 标记这是一个异步 loader
  this.async();
  // 启用缓存，提高构建性能
  this.cacheable && this.cacheable(true);
  // 获取并标准化当前处理文件的绝对路径
  const filePath = normalizePath(this.resourcePath); // 当前文件的绝对路径
  // 获取 loader 的配置选项
  const options = this.query;

  // start server and inject client code to entry file
  // 调用核心函数注入 web component 代码
  content = await getCodeWithWebComponent({
    options,
    file: filePath,
    code: content,
    record: options.record,
  });

  // 返回处理后的结果
  // 参数依次为：错误信息(null 表示无错误)、处理后的代码、source map、元数据
  this.callback(null, content, source, meta);
}
