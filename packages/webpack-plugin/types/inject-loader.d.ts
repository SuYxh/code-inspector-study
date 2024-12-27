/**
 * Webpack loader，用于注入 web component 相关代码
 * @param content - 源文件的内容字符串
 * @param source - source map 相关信息
 * @param meta - 文件的元数据信息
 */
export default function WebpackCodeInjectLoader(content: string, source: any, meta: any): Promise<void>;
