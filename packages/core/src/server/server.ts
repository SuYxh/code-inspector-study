// 这个文件的主要职责是：
// 1、创建和管理本地 HTTP 服务器，用于接收客户端的代码定位请求
// 2、处理端口分配，确保使用可用端口
// 3、处理跨域请求
// 4、调用编辑器打开指定文件和位置
// 5、提供服务器状态管理

// 服务器的工作流程是：
// 1、客户端点击元素 →
// 2、发送 HTTP 请求（带有文件、行号、列号信息）→
// 3、服务器接收请求 →
// 4、执行钩子函数 →
// 5、调用编辑器 API 打开文件

// 启动本地接口，访问时唤起vscode
import http from 'http';
import portFinder from 'portfinder';
// import { launchIDE } from 'launch-ide';
import { launchIDE } from '../launch-ide';
import { DefaultPort } from '../shared/constant';
import type { CodeOptions, RecordInfo } from '../shared';

/**
 * 创建本地服务器
 * @param {Function} callback - 服务器启动成功后的回调函数，接收端口号作为参数
 * @param {CodeOptions} [options] - 插件配置选项
 *   @param {Object} [options.hooks] - 钩子函数
 *     @param {Function} [options.hooks.afterInspectRequest] - 点击元素后、打开 IDE 前的钩子
 *   @param {string} [options.editor] - 编辑器类型（vscode、webstorm 等）
 *   @param {string} [options.openIn] - 打开方式（tab、window 等）
 *   @param {string} [options.pathFormat] - 路径格式化方式
 */
export function createServer(callback: (port: number) => any, options?: CodeOptions) {
  const server = http.createServer((req: any, res: any) => {
    // 收到请求唤醒vscode
    // 解析请求参数
    const params = new URLSearchParams(req.url.slice(1));
    const file = decodeURIComponent(params.get('file') as string);
    const line = Number(params.get('line'));
    const column = Number(params.get('column'));

    // 设置 CORS 响应头
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Private-Network': 'true',
    });
    res.end('ok');

    // 执行点击后的钩子函数
    // 调用 hooks
    options?.hooks?.afterInspectRequest?.(options, { file, line, column });
    // 打开 IDE
    // 调用 launch-ide 打开编辑器
    launchIDE({
      // 文件路径
      file,
      // 行号
      line,
      // 列号
      column,
      // 编辑器类型
      editor: options?.editor,
      // 打开方式
      method: options?.openIn,
      // 路径格式化方式
      format: options?.pathFormat,
    });
  });

  // 寻找可用接口
  // 从默认端口开始查找可用端口
  portFinder.getPort({ port: DefaultPort }, (err: Error, port: number) => {
    if (err) {
      throw err;
    }
    // 启动服务器并执行回调
    server.listen(port, () => {
      callback(port);
    });
  });
}


/**
 * 启动服务器的入口函数
 * @param {CodeOptions} options - 插件配置选项
 * @param {RecordInfo} record - 记录对象，用于存储服务器状态
 *   @param {number} [record.port] - 服务器端口号
 *   @param {Promise<number>} [record.findPort] - 查找端口的 Promise
 * @returns {Promise<void>}
 * 
 * 主要功能：
 * 1. 确保服务器只启动一次
 * 2. 使用 Promise 处理异步端口查找
 * 3. 缓存已找到的端口号
 */
export async function startServer(options: CodeOptions, record: RecordInfo) {
   // 如果服务器未启动
  if (!record.port) {
    // 如果未开始查找端口
    if (!record.findPort) {
      // 创建端口查找 Promise
      record.findPort = new Promise((resolve) => {
        createServer((port: number) => {
          resolve(port);
        }, options);
      });
    }
    // 等待端口查找完成并保存
    record.port = await record.findPort;
  }
}
