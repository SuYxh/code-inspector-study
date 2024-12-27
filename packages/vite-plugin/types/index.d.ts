import { CodeOptions } from 'code-inspector-core';
interface Options extends CodeOptions {
    close?: boolean;
    output: string;
}
export declare function ViteCodeInspectorPlugin(options: Options): {
    /**
     * @description: 判断插件是否应该被应用
     * 执行时机：插件加载时最先执行
     * 作用：决定插件是否被启用
     * 返回 true 时插件生效，返回 false 时插件被跳过
     * @param {*} _
     * @param {*} param2
     * @return {*}
     */
    apply(_: any, { command }: {
        command: any;
    }): boolean;
    /**
     * @description: 转换代码
     * 执行时机：在每个模块被加载时执行
     * 触发条件：当 Vite 处理任何源文件时都会调用
     * 执行顺序：由于设置了 enforce: 'pre'，会在其他插件之前执行
     * 作用：对文件内容进行转换，注入客户端代码或处理路径
     *
     * 文件处理顺序：
     * 1. 先判断是否为 node_modules 文件
     * 2. 然后根据文件扩展名和参数判断文件类型
     * 3. 最后根据文件类型进行相应的代码转换
     * @param {*} code
     * @param {*} id
     * @return {*}
     */
    transform(code: any, id: any): Promise<any>;
    /**
     * @description: 追加到 html 中，适配 MPA 项目
     * 执行时机：在处理 HTML 文件时执行
     * 触发条件：当 Vite 处理 HTML 文件时会调用
     * 执行顺序：在其他插件之后执行
     * 作用：将客户端代码注入到 HTML 中
     * @param {*} html
     * @return {*}
     */
    transformIndexHtml(html: any): Promise<any>;
    enforce?: "pre";
    name: string;
};
export {};
