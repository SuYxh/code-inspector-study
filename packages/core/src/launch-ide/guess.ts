import fs from "fs";
import path from "path";
import child_process from "child_process";
import dotenv from "dotenv";
import { Platform, Editor } from "./type";
import { COMMON_EDITOR_PROCESS_MAP, COMMON_EDITORS_MAP } from "./editor-info";

/**
 * ps ax -o comm= 解析：命令的作用是列出系统中所有正在运行的进程，并且只显示这些进程的可执行文件名，不显示其他信息（如进程ID、CPU使用率等）。
 * 
 * 1、ps: 是一个用于显示当前进程状态的命令。它可以列出系统中正在运行的进程，并提供关于这些进程的详细信息。
 * 2、a：显示所有用户的进程，而不仅仅是当前用户的进程
 * 3、x：显示没有控制终端的进程（通常是后台进程）
 * 4、-o 选项允许你自定义输出格式。comm= 指定了输出中只显示命令名称（即进程的可执行文件名），并且不显示列标题。
 */

// 不同平台获取进程列表的命令
const ProcessExecutionMap = {
  darwin: "ps ax -o comm=",
  linux: "ps -eo comm --sort=comm",
  // wmic's performance is better, but window11 not build in
  win32: 'wmic process where "executablepath is not null" get executablepath',
};

// powershell's compatibility is better
// Windows 系统的备用命令（使用 PowerShell）
const winExecBackup =
  'powershell -NoProfile -Command "Get-CimInstance -Query \\"select executablepath from win32_process where executablepath is not null\\" | % { $_.ExecutablePath }"';

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
export function guessEditor(_editor?: Editor) {
  let customEditors: string[] | null = null;

  // webpack
  console.log('process.env.CODE_EDITOR', process.env.CODE_EDITOR);
  // 1. 检查 webpack 环境变量
  if (process.env.CODE_EDITOR) {
    const editor = getEditorByCustom(process.env.CODE_EDITOR as any);
    if (editor) {
      customEditors = editor;
    } else {
      return [process.env.CODE_EDITOR];
    }
  }

  // vite
  // 2. 检查 .env.local 文件配置
  const envPath = path.resolve(process.cwd(), ".env.local");
  console.log('envPath', envPath)
  if (fs.existsSync(envPath) && !customEditors) {
    const envFile = fs.readFileSync(envPath, "utf-8");
    const envConfig = dotenv.parse(envFile || "");
    if (envConfig.CODE_EDITOR) {
      const editor = getEditorByCustom(envConfig.CODE_EDITOR as any);
      if (editor) {
        customEditors = editor;
      } else {
        return [envConfig.CODE_EDITOR];
      }
    }
  }

  // 3. 检查用户传入的编辑器参数
  if (_editor && !customEditors) {
    const editor = getEditorByCustom(_editor);
    if (editor) {
      customEditors = editor;
    }
  }

  try {
    let first: string[] | undefined;

    // 获取当前操作系统平台
    const platform = process.platform as "darwin" | "linux" | "win32";
    const isWin32 = process.platform === "win32";

    // 获取进程列表命令
    const execution = ProcessExecutionMap[platform];
    const commonEditors = COMMON_EDITORS_MAP[platform];

    // Windows 系统下处理中文字符编码
    compatibleWithChineseCharacter(isWin32);

    // 4. 获取正在运行的进程列表
    let output = "";
    try {
      output = child_process.execSync(execution, { encoding: "utf-8" });
    } catch (error) {
      // Windows 系统下如果主命令失败，使用备用命令
      if (isWin32) {
        output = child_process.execSync(winExecBackup, { encoding: "utf-8" });
      }
    }

    // 获取所有支持的编辑器名称
    const editorNames = Object.keys(commonEditors);
    // 解析进程列表
    const runningProcesses = output
      .split(isWin32 ? "\r\n" : "\n")
      .map((item) => item.trim());

    // 遍历所有支持的编辑器，检查是否在运行
    for (let i = 0; i < editorNames.length; i++) {
      const editorName = editorNames[i] as keyof typeof commonEditors;
      let editor: string = ""; // 要返回的 editor 结果
      let runningEditor: string = ""; // 正在运行的 editor 进程名称

      // 检测当前 editorName 是否正在运行
      // 根据不同平台检测编辑器是否正在运行
      if (isWin32) {
        // Windows 平台：通过进程路径的基础名称匹配
        const processPath = runningProcesses.find(
          (_process) => path.basename(_process) === editorName
        );
        if (processPath) {
          runningEditor = path.basename(processPath);
          editor = processPath;
        }
      } else if (platform === "darwin") {
        // macOS 平台：通过进程名称后缀匹配
        const runningProcess = runningProcesses.find((_process) =>
          _process.endsWith(editorName)
        );
        // 命中了 IDE
        if (runningProcess) {
          const prefixPath = runningProcess.replace(editorName, "");
          const processName = commonEditors[editorName] as string;
          runningEditor = editorName;
          if (processName.includes("/")) {
            // 使用 应用进程 路径
            editor = `${prefixPath}${processName}`;
          } else {
            // 使用 CLI 路径
            editor = processName;
          }
        }
      } else {
        // Linux 平台：简单的进程名称匹配
        if (output.indexOf(editorName) !== -1) {
          runningEditor = editorName;
          editor = commonEditors[editorName];
        }
      }

      // 如果找到正在运行的编辑器
      if (runningEditor && editor) {
        if (customEditors?.includes(runningEditor)) {
          // 优先返回用户自定义的 editor
          return [editor];
        }
        if (!first) {
          first = [editor];
        }
      }
    }

    // 返回找到的第一个编辑器
    if (first) {
      return first;
    }
  } catch (error) {
    // Ignore...
  }

  // 5. 如果上述方法都未找到编辑器，尝试使用环境变量
  console.log("process.env.VISUAL", process.env.VISUAL);
  console.log("process.env.EDITOR", process.env.EDITOR);
  if (process.env.VISUAL) {
    // VISUAL： 通常用于指定一个全功能的可视化编辑器， 比如 vim、emacs、nano 等
    return [process.env.VISUAL];
  } else if (process.env.EDITOR) {
    // EDITOR：是一个更基础的环境变量，通常指定一个更简单的编辑器， 当 VISUAL 未设置时会使用这个
    return [process.env.EDITOR];
  }

  // 如果所有方法都失败，返回 null
  return [null];
}

// 用户指定了 IDE 时，优先走此处
const getEditorByCustom = (editor: Editor): string[] | null => {
  const platform = process.platform as Platform;
  return (
    (COMMON_EDITOR_PROCESS_MAP[platform] &&
      COMMON_EDITOR_PROCESS_MAP[platform][editor]) ||
    null
  );
};

// 兼容中文编码
const compatibleWithChineseCharacter = (isWin32: boolean): void => {
  if (isWin32) {
    // 兼容 windows 系统 powershell 中文乱码问题
    try {
      //  是 Windows 系统中的一个命令，用于更改命令字符集，65001: UTF-8 的代码页编号
      child_process.execSync("chcp 65001");
    } catch (error) {
      // ignore errors
    }
  }
};
