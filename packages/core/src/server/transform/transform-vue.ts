// 这个文件的主要功能是：
// 1、处理 Vue 模板：
// - 支持普通 Vue 模板和 Pug 模板
// - 为模板中的元素添加位置信息属性
// 2、核心处理逻辑：
// - 解析模板为 AST
// - 遍历 AST 节点
// - 在适当位置注入位置信息
// - 使用 MagicString 进行代码修改
// 3、特殊处理：
// - 对 Pug 模板有专门的处理逻辑
// - 维护了 pugMap 来存储 Pug 文件信息
// - 计算行偏移量以准确定位插入位置

// 这个转换器是代码定位功能的重要组成部分，它确保了 Vue 模板中的元素能够被正确定位到源代码位置。

import MagicString from 'magic-string';
import { EscapeTags, PathName, isEscapeTags } from '../../shared';
import type {
  TemplateChildNode,
  NodeTransform,
  ElementNode,
} from '@vue/compiler-dom';
import { parse, transform } from '@vue/compiler-dom';
import * as pug from 'volar-service-pug/lib/languageService';


/**
 * AST 节点位置信息
 */
interface AstLocation {
  column: number;
  line: number;
}

/**
 * Pug 模板文件信息接口
 */
interface PugFileInfo {
  content: string;
  offsets: number[];
}

// Vue 元素节点类型常量
const VueElementType = 1;
// 属性节点类型常量
const AttributeNodeType = 6;
// 使用了 pug 模板的 vue 文件集合
const pugMap = new Map<string, PugFileInfo>(); // 使用了 pug 模板的 vue 文件集合


/**
 * 判断目标位置是否在模板范围内
 * @param {AstLocation} target - 目标位置
 * @param {AstLocation} start - 起始位置
 * @param {AstLocation} end - 结束位置
 * @returns {boolean} 是否在范围内
 */
function belongTemplate(
  target: AstLocation,
  start: AstLocation,
  end: AstLocation
) {
  return (
    (target.line > start.line && target.line < end.line) ||
    (target.line === start.line &&
      (target.column >= start.column || target.column === undefined)) ||
    (target.line === end.line &&
      (target.column <= end.column || target.column === undefined))
  );
}

/**
 * Pug AST 转换参数接口
 */
interface TransformPugParams {
  // Pug AST 节点
  node: pug.Node;
  // Vue 模板节点
  templateNode: ElementNode;
  // 用于代码修改的工具实例： MagicString 实例
  s: MagicString;
  // 需要跳过的标签
  escapeTags: EscapeTags;
  // 文件路径
  filePath: string;
}


/**
 * 转换 Pug AST
 * @param {TransformPugParams} params - 转换参数
 */
function transformPugAst(params: TransformPugParams) {
  const { node, templateNode, escapeTags, s, filePath } = params;
  // 如果节点不存在，直接返回
  if (!node) {
    return;
  }
  // 处理块级节点
  if (node.type === 'Block') {
    node.nodes.forEach((childNode) => {
      transformPugAst({ ...params, node: childNode });
    });
    // 处理标签节点
  } else if (node.type === 'Tag') {
    const nodeLocation = {
      line: node.line,
      column: (node as pug.TagNode).column,
    };

    // 检查节点是否在模板范围内
    const belongToTemplate = belongTemplate(
      nodeLocation,
      templateNode.loc.start,
      templateNode.loc.end
    );

    // 如果节点在模板内，且未添加过路径属性，且不在跳过标签列表中
    if (
      belongToTemplate &&
      !node.attrs.some((attr) => attr.name === PathName) &&
      !isEscapeTags(escapeTags, node.name)
    ) {
      // 获取文件信息， 向 dom 上添加一个带有 filepath/row/column 的属性
      const { offsets, content } = pugMap.get(filePath) as PugFileInfo;
      // 计算插入位置
      const offset = offsets[node.line - 1] + node.column - 1;
      let insertPosition = offset + node.name.length;

      // 根据节点是否已有属性决定插入方式
      if (content[insertPosition] === '(') {
        // 已有属性，在属性列表开始处添加
        // 说明已有 attributes
        const addition = `${PathName}="${filePath}:${node.line}:${node.column}:${node.name}", `;
        s.prependLeft(insertPosition + 1, addition);
      } else {
        // 无属性，创建新的属性列表
        const addition = `(${PathName}="${filePath}:${node.line}:${node.column}:${node.name}")`;
        s.prependLeft(insertPosition, addition);
      }
    }
    // 递归处理子块
    transformPugAst({ ...params, node: node.block });
  }
}



/**
 * 转换 Vue 文件
 * @param {string} content - 文件内容
 * @param {string} filePath - 文件路径
 * @param {EscapeTags} escapeTags - 需要跳过的标签
 * @returns {string} 转换后的代码
 */
export function transformVue(
  content: string,
  filePath: string,
  escapeTags: EscapeTags
) {
  const s = new MagicString(content);

  // 解析 Vue 模板
  const ast = parse(content, {
    comments: true,
  });

  // 判断是否为 Pug 模版
  // 查找模板节点
  const templateNode = ast.children.find(
    (node) => node.type === VueElementType && node.tag === 'template'
  ) as ElementNode;

  // 检查是否为 Pug 模板
  if (
    templateNode &&
    (templateNode.props || []).some(
      (prop) =>
        prop.type === AttributeNodeType &&
        prop.name === 'lang' &&
        prop.value?.content === 'pug'
    )
  ) {
    // 处理 Pug 模板
    const lines = content.split('\n');
    const offsets = new Array(lines.length);
    offsets[0] = 0;
    // 计算每行的偏移量
    for (let i = 1; i < offsets.length; i++) {
      offsets[i] = offsets[i - 1] + lines[i - 1].length + 1; // 1为\n的长度
    }
    // 记录 Pug 文件信息
    pugMap.set(filePath, { content, offsets });
  }

  // 根据模板类型选择处理方式
  if (pugMap.has(filePath) && templateNode) {
    // 处理 Pug 模板
    const pugFile = pug.baseParse(content);
    transformPugAst({
      node: pugFile.ast as pug.Node,
      filePath,
      s,
      escapeTags,
      templateNode,
    });
  } else {
     // 处理普通 Vue 模板
    transform(ast, {
      nodeTransforms: [
        ((node: TemplateChildNode) => {
          if (
            !node.loc.source.includes(PathName) &&
            node.type === VueElementType &&
            !isEscapeTags(escapeTags, node.tag)
          ) {
            // 向 DOM 上添加路径属性， 向 dom 上添加一个带有 filepath/row/column 的属性
            const insertPosition = node.loc.start.offset + node.tag.length + 1;
            const { line, column } = node.loc.start;
            const addition = ` ${PathName}="${filePath}:${line}:${column}:${
              node.tag
            }"${node.props.length ? ' ' : ''}`;

            s.prependLeft(insertPosition, addition);
          }
        }) as NodeTransform,
      ],
    });
  }

  return s.toString();
}
