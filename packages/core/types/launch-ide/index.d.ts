/**
 * 这个文件的主要工作流程是：
 * 1、通过 launchIDE 函数接收打开文件的相关参数
 * 2、使用 guessEditor 推测或获取配置的编辑器
 * 3、处理文件路径（特别是在 WSL 环境下）
 * 4、根据不同的编辑器和操作系统构建启动命令
 * 5、使用 child_process 启动编辑器进程
 * 6、处理可能出现的错误并提供反馈
 *
 * 特别的处理包括：
 * 1、Windows 系统下的特殊字符转义
 * 2、WSL 环境下的路径转换
 * 3、终端编辑器的进程管理
 * 4、支持多种 IDE 打开方式（复用或新建窗口）
 * 5、环境变量配置的读取和解析
这个工具库的主要用途是在开发工具中集成"点击打开源代码"的功能，比如在开发调试工具中点击错误堆栈，直接在 IDE 中打开对应的源代码位置。
 */
import { Editor, IDEOpenMethod } from "./type";
interface LaunchIDEParams {
    file: string;
    line?: number;
    column?: number;
    editor?: Editor;
    method?: IDEOpenMethod;
    format?: string | string[];
    onError?: (file: string, error: string) => void;
}
/**
 * 启动 IDE 并打开指定文件
 * @param params 配置参数，包括：
 *   - file: 要打开的文件路径
 *   - line: 行号（可选）
 *   - column: 列号（可选）
 *   - editor: 指定的编辑器（可选）
 *   - method: 打开方式（可选）
 *   - format: 路径格式化配置（可选）
 *   - onError: 错误处理回调（可选）
 */
export declare function launchIDE(params: LaunchIDEParams): void;
export * from "./type";
export { formatOpenPath } from "./get-args";
