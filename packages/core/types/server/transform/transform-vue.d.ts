import { EscapeTags } from '../../shared';
/**
 * 转换 Vue 文件
 * @param {string} content - 文件内容
 * @param {string} filePath - 文件路径
 * @param {EscapeTags} escapeTags - 需要跳过的标签
 * @returns {string} 转换后的代码
 */
export declare function transformVue(content: string, filePath: string, escapeTags: EscapeTags): string;
