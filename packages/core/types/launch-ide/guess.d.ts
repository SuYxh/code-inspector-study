import { Editor } from "./type";
/**
 * 推测或获取用户当前使用的编辑器
 * 优先级：
 * 1、首先检查配置源（环境变量、配置文件、参数）
 * 2、如果没有配置，则尝试从运行中的进程列表查找编辑器
 * 3、根据不同的操作系统平台使用不同的策略匹配编辑器进程
 * 4、如果仍未找到，则尝试使用系统环境变量 VISUAL 或 EDITOR
 * 5、最后返回找到的编辑器路径和参数，或返回 null
 *
 * @param _editor 可选的指定编辑器
 * @returns [编辑器路径, ...启动参数]
 */
export declare function guessEditor(_editor?: Editor): string[] | null[];
