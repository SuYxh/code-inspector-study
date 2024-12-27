import MagicString from "magic-string";
import { PathName, EscapeTags, isEscapeTags } from "../../shared";
import vueJsxPlugin from "@vue/babel-plugin-jsx";
// @ts-ignore
import { parse, traverse } from "@babel/core";
// @ts-ignore
import tsPlugin from "@babel/plugin-transform-typescript";
// @ts-ignore
import importMetaPlugin from "@babel/plugin-syntax-import-meta";
// @ts-ignore
import proposalDecorators from "@babel/plugin-proposal-decorators";

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
export function transformJsx(
  content: string,
  filePath: string,
  escapeTags: EscapeTags
) {
  console.log("transformJsx-->", content);

  // 创建 MagicString 实例，用于字符串操作
  const s = new MagicString(content);
  console.log("MagicString-->", s);

  try {
    // 解析代码生成 AST，配置相关 babel 插件
    const ast = parse(content, {
      // 禁用项目中的 .babelrc 配置文件，确保只使用这里指定的配置
      babelrc: false,
      // 在转换过程中保留代码注释
      comments: true,
      // 禁用项目中的 babel.config.js 配置文件，确保只使用这里指定的配置
      configFile: false,
      // 启用插件
      plugins: [
        // 支持 import.meta 语法, 例如：import.meta.url 或 import.meta.env 等 ES 模块元信息的访问
        importMetaPlugin,
        // 将 Vue 的 JSX 语法转换为合法的 JavaScript 代码
        [vueJsxPlugin, {}],
        // 支持 TypeScript 的 JSX 语法
        // isTSX: true：启用 TSX 支持，允许在 TypeScript 中使用 JSX
        // allowExtensions: true：允许使用 TypeScript 的扩展语法
        [tsPlugin, { isTSX: true, allowExtensions: true }],
        // 支持装饰器语法
        // legacy: true：使用旧版装饰器语法（Stage 1），与 TypeScript 的实现兼容
        [proposalDecorators, { legacy: true }],
      ],
    });

    console.log("ast-->", ast);

    // 遍历 AST
    traverse(ast!, {
      enter({ node }: any) {
        // 获取节点的标签名和属性
        const nodeName = node?.openingElement?.name?.name || "";
        const attributes = node?.openingElement?.attributes || [];

        // 检查是否为 JSX 元素且不在跳过标签列表中
        if (
          node.type === "JSXElement" &&
          nodeName &&
          !isEscapeTags(escapeTags, nodeName)
        ) {
          // 如果已经存在 PathName 属性，则跳过
          if (
            attributes.some(
              (attr: any) =>
                attr.type !== "JSXSpreadAttribute" &&
                attr.name?.name === PathName
            )
          ) {
            return;
          }

          // 向 dom 上添加一个带有 filepath/row/column 的属性
          // 计算插入位置：
          // - 如果是自闭合标签 (<Tag />)，则在结束前 2 个字符
          // - 如果是普通标签 (<Tag>)，则在结束前 1 个字符
          const insertPosition =
            node.openingElement.end - (node.openingElement.selfClosing ? 2 : 1);

          // 获取节点在源码中的位置信息
          const { line, column } = node.loc.start;

          // 构造要添加的属性字符串，包含文件路径、行号、列号和标签名
          const addition = ` ${PathName}="${filePath}:${line}:${
            column + 1
          }:${nodeName}"${node.openingElement.attributes.length ? " " : ""}`;

          // 在指定位置插入属性
          s.prependLeft(insertPosition, addition);
        }
      },
    });

    console.log("s.toString()-->", s.toString());
    // 返回转换后的代码
    return s.toString();
  } catch (error) {
    console.log("error-->", error);
    return s.toString();
  }
}
