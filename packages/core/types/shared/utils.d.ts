import { Condition, EscapeTags } from './type';
export declare function getIP(ip: boolean | string): string;
export declare function fileURLToPath(fileURL: string): string;
export declare function isJsTypeFile(file: string): boolean;
export declare function getFilePathWithoutExt(filePath: string): string;
/**
 * 标准化文件路径，使其在不同操作系统下保持一致的格式
 * @param filepath 需要标准化的文件路径
 * @returns 返回标准化后的路径
 *
 * 使用示例：
 * 1. Windows 路径：
 *    normalizePath('C:\\Users\\name\\project')
 *    返回: 'C:/Users/name/project'
 *
 * 2. Unix 路径：
 *    normalizePath('/usr/local/bin')
 *    返回: '/usr/local/bin'
 */
export declare function normalizePath(filepath: string): string;
export declare function isEscapeTags(escapeTags: EscapeTags, tag: string): boolean;
export declare function getDenpendencies(): string[];
type BooleanFunction = () => boolean;
export declare function isDev(userDev: boolean | BooleanFunction | undefined, systemDev: boolean): boolean;
export declare function matchCondition(condition: Condition, file: string): boolean;
export declare function getMappingFilePath(file: string, mappings?: Record<string, string> | Array<{
    find: string | RegExp;
    replacement: string;
}>): string;
export {};
