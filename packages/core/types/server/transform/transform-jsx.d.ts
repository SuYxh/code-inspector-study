import { EscapeTags } from "../../shared";
/**
 * 转换 JSX 代码，为 JSX 元素添加位置信息属性
 *
 * 这个方法的主要作用是：
 * 1、接收源代码、文件路径和需要跳过的标签列表作为参数
 * 2、使用 Babel 解析代码生成 AST（抽象语法树）
 * 3、遍历 AST，找到所有的 JSX 元素
 * 4、对于每个 JSX 元素：
 *  - 检查是否需要跳过（在 escapeTags 中的标签）
 *  - 检查是否已经有 PathName 属性
 *  - 如果需要处理，则添加包含位置信息的属性（文件路径、行号、列号、标签名）
 * 5、最后返回转换后的代码
 *
 * @param content - 源代码内容
 * @param filePath - 文件路径
 * @param escapeTags - 需要跳过的标签名称
 * @returns 转换后的代码
 */
export declare function transformJsx(content: string, filePath: string, escapeTags: EscapeTags): string;
