import { LitElement, css, html } from "lit";
import { property, query, state } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";
import { PathName, DefaultPort } from "../shared";
import { formatOpenPath } from "launch-ide";

const styleId = "__code-inspector-unique-id";

const MacHotKeyMap = {
  ctrlKey: "^control",
  altKey: "⌥option",
  metaKey: "⌘command",
  shiftKey: "shift",
};

const WindowsHotKeyMap = {
  ctrlKey: "Ctrl",
  altKey: "Alt",
  metaKey: "⊞Windows",
  shiftKey: "Shift",
};

interface CodeInspectorHtmlElement extends HTMLElement {
  "data-insp-path": string;
}

export class CodeInspectorComponent extends LitElement {
  /** 激活检查模式的组合键，多个键用逗号分隔，如 'shiftKey,altKey' */
  @property()
  hotKeys: string = "shiftKey,altKey";
  /** 本地服务端口 */
  @property()
  port: number = DefaultPort;
  /** 是否展示开关按钮 */
  @property()
  showSwitch: boolean = false;
  /** 点击元素后是否自动关闭检查模式 */
  @property()
  autoToggle: boolean = false;
  /** 是否隐藏控制台 */
  @property()
  hideConsole: boolean = false;
  /** 是否启用IDE定位功能 */
  @property()
  locate: boolean = true;
  /** 是否启用复制功能，可以是布尔值或复制格式字符串 */
  @property()
  copy: boolean | string = false;
  /** 本地服务IP */
  @property()
  ip: string = "localhost";

  /**
   * 当前选中元素的位置信息
   * 包含元素的位置(top/right/bottom/left)
   * 以及padding/border/margin的尺寸
   */
  @state()
  position = {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    padding: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
    border: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
    margin: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
  }; // 弹窗位置

  /** 选中节点的信息，包含组件名称、代码行列号和文件路径 */
  @state()
  element = { name: "", line: 0, column: 0, path: "" }; // 选中节点信息
  /** 信息浮块的位置类名，控制显示在元素的上下左右 */
  @state()
  infoClassName = { vertical: "", horizon: "" }; // 信息浮块位置类名
  /** 信息浮块宽度 */
  @state()
  infoWidth = "300px";
  /** 是否显示检查器UI */
  @state()
  show = false; // 是否展示
  /** 是否正在拖拽开关按钮 */
  @state()
  dragging = false; // 是否正在拖拽中

  /**
   * 鼠标拖拽相关位置信息
   * baseX/baseY: 开关按钮的初始位置
   * moveX/moveY: 鼠标移动的位置
   */
  @state()
  mousePosition = { baseX: 0, baseY: 0, moveX: 0, moveY: 0 };
  /** 是否通过开关按钮打开检查模式 */
  @state()
  open = false; // 点击开关打开
  /** 开关按钮是否被移动过 */
  @state()
  moved = false;
  /** 鼠标是否悬停在开关按钮上 */
  @state()
  hoverSwitch = false;
  /** 保存body原始的userSelect样式值 */
  @state()
  preUserSelect = "";
  /**
   * 发送请求的方式
   * xhr: 使用XMLHttpRequest
   * img: 使用Image对象(用于处理某些环境下XHR被拦截的情况)
   */
  @state()
  sendType: "xhr" | "img" = "xhr";

  /** 开关按钮的DOM引用 */
  @query("#inspector-switch")
  inspectorSwitchRef!: HTMLDivElement;

  /**
   * 检查当前按键组合是否匹配配置的热键
   * @param e - 键盘或鼠标事件对象
   * @returns {boolean} 如果当前按键组合匹配配置的热键则返回true
   * @example
   * 如果hotKeys为'shiftKey,altKey'
   * 当同时按下shift和alt键时返回true
   * isTracking(event) // => true
   */
  isTracking = (e: any) => {
    return (
      this.hotKeys && this.hotKeys.split(",").every((key) => e[key.trim()])
    );
  };

  // 20px -> 20
  /**
   * 获取DOM元素的计算样式值并转换为数字
   * @param target - 目标DOM元素
   * @param property - CSS属性名
   * @returns {number} 返回去除'px'单位后的数值
   * @example
   * 如果元素的padding-top为'20px'
   * getDomPropertyValue(element, 'padding-top') // => 20
   */
  getDomPropertyValue = (target: HTMLElement, property: string) => {
    const computedStyle = window.getComputedStyle(target);
    return Number(computedStyle.getPropertyValue(property).replace("px", ""));
  };

  // 渲染遮罩层
  /**
   * 渲染元素的检查覆盖层
   * 包括元素的位置信息、盒模型尺寸、信息浮层位置等
   * @param target - 目标DOM元素
   */
  renderCover = (target: HTMLElement) => {
    // 设置 target 的位置
    // 获取目标元素的位置信息（相对于视口）
    const { top, right, bottom, left } = target.getBoundingClientRect();

    // 设置元素的完整位置信息，包括边界框和盒模型尺寸
    this.position = {
      top,
      right,
      bottom,
      left,
      border: {
        top: this.getDomPropertyValue(target, "border-top-width"),
        right: this.getDomPropertyValue(target, "border-right-width"),
        bottom: this.getDomPropertyValue(target, "border-bottom-width"),
        left: this.getDomPropertyValue(target, "border-left-width"),
      },
      padding: {
        top: this.getDomPropertyValue(target, "padding-top"),
        right: this.getDomPropertyValue(target, "padding-right"),
        bottom: this.getDomPropertyValue(target, "padding-bottom"),
        left: this.getDomPropertyValue(target, "padding-left"),
      },
      margin: {
        top: this.getDomPropertyValue(target, "margin-top"),
        right: this.getDomPropertyValue(target, "margin-right"),
        bottom: this.getDomPropertyValue(target, "margin-bottom"),
        left: this.getDomPropertyValue(target, "margin-left"),
      },
    };
    // 浏览器高度
    const browserHeight = document.documentElement.clientHeight;
    // 浏览器宽度
    const browserWidth = document.documentElement.clientWidth;

    // 自动调整信息弹出位置
    // 计算元素到视口各边的距离
    const bottomToViewPort =
      browserHeight -
      bottom -
      this.getDomPropertyValue(target, "margin-bottom"); // 距浏览器视口底部距离
    const rightToViewPort =
      browserWidth - right - this.getDomPropertyValue(target, "margin-right"); // 距浏览器右边距离
    const topToViewPort = top - this.getDomPropertyValue(target, "margin-top");
    const leftToViewPort =
      left - this.getDomPropertyValue(target, "margin-left");
    // 根据元素位置自动设置信息浮层的显示位置类名
    this.infoClassName = {
      // 垂直方向：优先显示在元素上方，空间不足时显示在下方
      vertical:
        topToViewPort > bottomToViewPort
          ? topToViewPort < 100
            ? "element-info-top-inner" // 上方空间小于100px时显示在内部
            : "element-info-top" // 显示在上方
          : bottomToViewPort < 100
          ? "element-info-bottom-inner" // 下方空间小于100px时显示在内部
          : "element-info-bottom", // 显示在下方
      // 水平方向：根据左右空间决定显示位置
      horizon:
        leftToViewPort >= rightToViewPort
          ? "element-info-right" // 左侧空间更大时靠右对齐
          : "element-info-left", // 右侧空间更大时靠左对齐
    };

    // 计算信息浮层的宽度
    this.infoWidth =
      Math.max(
        // 元素宽度（包含外边距）
        right -
          left +
          this.getDomPropertyValue(target, "margin-right") +
          this.getDomPropertyValue(target, "margin-left"),
        // 与可用空间中的较小值（最大300px）
        Math.min(300, Math.max(leftToViewPort, rightToViewPort))
      ) + "px";
    // 增加鼠标光标样式
    this.addGlobalCursorStyle();
    // 保存并禁用文本选择功能， 防止 select
    if (!this.preUserSelect) {
      this.preUserSelect = getComputedStyle(document.body).userSelect;
    }
    document.body.style.userSelect = "none";
    // 获取元素的源代码路径信息
    let paths =
      target.getAttribute(PathName) ||
      (target as CodeInspectorHtmlElement)[PathName] ||
      "";

    // Todo: transform astro inside
    // 处理Astro框架的特殊情况
    if (!paths && target.getAttribute("data-astro-source-file")) {
      paths = `${target.getAttribute(
        "data-astro-source-file"
      )}:${target.getAttribute(
        "data-astro-source-loc"
      )}:${target.tagName.toLowerCase()}`;
    }

    // 解析路径信息
    const segments = paths.split(":");
    const name = segments[segments.length - 1];
    const column = Number(segments[segments.length - 2]);
    const line = Number(segments[segments.length - 3]);
    const path = segments.slice(0, segments.length - 3).join(":");
    // 更新元素信息
    this.element = { name, path, line, column };
    // 显示信息浮层
    this.show = true;
  };

  /**
   * 移除检查覆盖层
   * 清除检查模式相关的UI和样式
   */
  removeCover = () => {
    // 隐藏覆盖层
    this.show = false;
    // 移除全局鼠标指针样式
    this.removeGlobalCursorStyle();
    // 恢复文本选择功能
    document.body.style.userSelect = this.preUserSelect;
    // 清除保存的userSelect值
    this.preUserSelect = "";
  };

  /**
   * 添加全局鼠标指针样式
   * 为所有元素添加pointer光标样式
   * 通过动态创建style标签实现
   */
  addGlobalCursorStyle = () => {
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.setAttribute("id", styleId);
      style.innerText = `body * {
        cursor: pointer !important;
      }`;
      document.body.appendChild(style);
    }
  };

  /**
   * 移除全局鼠标指针样式
   * 删除之前添加的样式标签
   */
  removeGlobalCursorStyle = () => {
    const style = document.getElementById(styleId);
    if (style) {
      style.remove();
    }
  };

  /**
   * 通过XMLHttpRequest发送请求到本地服务
   * 用于在IDE中打开对应的源代码文件
   * 如果XHR请求失败，会自动切换到img方式发送请求
   */
  sendXHR = () => {
    const file = encodeURIComponent(this.element.path);
    // 构建请求URL，包含文件路径、行号和列号
    const url = `http://${this.ip}:${this.port}/?file=${file}&line=${this.element.line}&column=${this.element.column}`;
    // 创建XHR请求
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.send();
    // 监听错误事件，如果XHR失败则切换到img方式
    xhr.addEventListener("error", () => {
      this.sendType = "img";
      this.sendImg();
    });
  };

  /**
   * 通过创建img标签的方式发送请求
   * 这是一个备选方案，用于处理XHR被拦截的情况
   * 常见于企业微信侧边栏等内置浏览器环境
   *
   * 原理：浏览器会自动请求img的src，可以绕过一些XHR限制
   * 虽然请求会失败（因为返回的不是图片），但请求已经发出去了
   */
  // 通过img方式发送请求，防止类似企业微信侧边栏等内置浏览器拦截逻辑
  sendImg = () => {
    const file = encodeURIComponent(this.element.path);
    const url = `http://${this.ip}:${this.port}/?file=${file}&line=${this.element.line}&column=${this.element.column}`;
    const img = document.createElement("img");
    img.src = url;
  };

  // 请求本地服务端，打开vscode
  /**
   * 处理代码追踪功能
   * 1. 如果启用了locate功能，发送请求到本地服务打开IDE
   * 2. 如果启用了copy功能，复制格式化后的路径到剪贴板
   */
  trackCode = () => {
    if (this.locate) {
      if (this.sendType === "xhr") {
        this.sendXHR();
      } else {
        this.sendImg();
      }
    }
    if (this.copy) {
      const path = formatOpenPath(
        this.element.path,
        String(this.element.line),
        String(this.element.column),
        this.copy
      );
      this.copyToClipboard(path[0]);
    }
  };

  /**
   * 将文本复制到剪贴板
   * 优先使用现代的Clipboard API
   * 降级使用传统的document.execCommand方法
   *
   * @param text - 要复制的文本内容
   */
  copyToClipboard(text: string) {
    if (typeof navigator?.clipboard?.writeText === "function") {
      navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
  }

  // 移动按钮
  moveSwitch = (e: MouseEvent | TouchEvent) => {
    if (e.composedPath().includes(this)) {
      this.hoverSwitch = true;
    } else {
      this.hoverSwitch = false;
    }
    // 判断是否在拖拽按钮
    if (this.dragging) {
      this.moved = true;
      this.inspectorSwitchRef.style.left =
        this.mousePosition.baseX +
        (this.getMousePosition(e).x - this.mousePosition.moveX) +
        "px";
      this.inspectorSwitchRef.style.top =
        this.mousePosition.baseY +
        (this.getMousePosition(e).y - this.mousePosition.moveY) +
        "px";
      return;
    }
  };

  isSamePositionNode = (node1: HTMLElement, node2: HTMLElement) => {
    const node1Rect = node1.getBoundingClientRect();
    const node2Rect = node2.getBoundingClientRect();
    return (
      node1Rect.top === node2Rect.top &&
      node1Rect.left === node2Rect.left &&
      node1Rect.right === node2Rect.right &&
      node1Rect.bottom === node2Rect.bottom
    );
  };

  // 鼠标移动渲染遮罩层位置
  /**
   * 处理鼠标/触摸移动事件
   * 用于在检查模式下实时更新覆盖层位置
   * @param e - 鼠标或触摸事件对象
   */
  handleMouseMove = (e: MouseEvent | TouchEvent) => {
    // 检查是否应该激活检查模式：
    // 1. (按下热键 && 不在拖拽中) 或者
    // 2. 开关按钮已打开
    // 3. 且鼠标不在开关按钮上
    if (
      ((this.isTracking(e) && !this.dragging) || this.open) &&
      !this.hoverSwitch
    ) {
      // 获取事件触发路径上的所有元素
      const nodePath = e.composedPath() as HTMLElement[];
      console.log("nodePath", nodePath);
      let targetNode;
      // 遍历事件路径上的所有元素， 寻找第一个有 data-insp-path 属性的元素
      for (let i = 0; i < nodePath.length; i++) {
        const node = nodePath[i];
        // 检查元素是否有源码路径属性
        if (
          (node.hasAttribute && node.hasAttribute(PathName)) ||
          node[PathName]
        ) {
          if (!targetNode) {
            // 如果还没有找到目标节点，就使用当前节点
            targetNode = node;
          } else if (this.isSamePositionNode(targetNode, node)) {
            // 如果新节点与已找到的节点位置相同
            // 优先使用新节点（通常是组件调用处的源码位置）
            // 优先寻找组件被调用处源码
            targetNode = node;
          }
        }
        // Todo: transform astro inside
        // 特殊处理 Astro 框架的元素
        if (node.hasAttribute && node.hasAttribute("data-astro-source-file")) {
          targetNode = node;
          break;
        }
      }
      // 根据是否找到目标节点决定显示或隐藏覆盖层
      if (targetNode) {
        this.renderCover(targetNode);
      } else {
        this.removeCover();
      }
    } else {
      // 不在检查模式下，移除覆盖层
      this.removeCover();
    }
  };

  // 鼠标点击唤醒遮罩层
  handleMouseClick = (e: MouseEvent | TouchEvent) => {
    if (this.isTracking(e) || this.open) {
      if (this.show) {
        // 阻止冒泡
        e.stopPropagation();
        // 阻止默认事件
        e.preventDefault();
        // 唤醒 vscode
        this.trackCode();
        // 清除遮罩层
        this.removeCover();
        if (this.autoToggle) {
          this.open = false;
        }
      }
    }
  };

  // disabled 的元素及其子元素无法触发 click 事件
  /**
   * 处理被禁用元素的点击事件
   * 因为disabled的元素无法触发click事件，所以需要特殊处理
   * @param e - 指针事件对象
   */
  handlePointerDown = (e: PointerEvent) => {
    // 检查目标元素及其祖先元素是否有disabled属性
    let disabled = false;
    let element = e.target as HTMLInputElement;
    while (element) {
      if (element.disabled) {
        disabled = true;
        break;
      }
      element = element.parentElement as HTMLInputElement;
    }

    // 如果元素不是禁用状态，直接返回
    if (!disabled) {
      return;
    }

    // 如果是禁用元素，且在检查模式下
    if (this.isTracking(e) || this.open) {
      if (this.show) {
        // 阻止冒泡
        e.stopPropagation();
        // 阻止默认事件
        e.preventDefault();
        // 唤醒 vscode
        this.trackCode();
        // 清除遮罩层
        this.removeCover();
        if (this.autoToggle) {
          this.open = false;
        }
      }
    }
  };

  // 监听键盘抬起，清除遮罩层
  handleKeyUp = (e: KeyboardEvent) => {
    if (!this.isTracking(e) && !this.open) {
      this.removeCover();
    }
  };

  // 打印功能提示信息
  printTip = () => {
    const agent = navigator.userAgent.toLowerCase();
    const isWindows = ["windows", "win32", "wow32", "win64", "wow64"].some(
      (item) => agent.toUpperCase().match(item.toUpperCase())
    );
    const hotKeyMap = isWindows ? WindowsHotKeyMap : MacHotKeyMap;
    const keys = this.hotKeys
      .split(",")
      .map((item) => "%c" + hotKeyMap[item.trim() as keyof typeof hotKeyMap]);
    const colorCount = keys.length * 2 + 1;
    const colors = Array(colorCount)
      .fill("")
      .map((_, index) => {
        if (index % 2 === 0) {
          return "color: #42b983; font-family: PingFang SC;";
        } else {
          return "color: #006aff; font-weight: bold; font-family: PingFang SC;";
        }
      });
    console.log(
      `%c[code-inspector-plugin]%c [Hello] 同时按住 ${keys.join(
        " %c+ "
      )}%c 时启用功能(点击页面元素可定位至编辑器源代码)`,
      "color: #006aff; font-weight: bolder;",
      ...colors
    );
  };

  // 获取鼠标位置
  getMousePosition = (e: MouseEvent | TouchEvent) => {
    return {
      x: e instanceof MouseEvent ? e.pageX : e.touches[0]?.pageX,
      y: e instanceof MouseEvent ? e.pageY : e.touches[0]?.pageY,
    };
  };

  // 记录鼠标按下时初始位置
  recordMousePosition = (e: MouseEvent | TouchEvent) => {
    this.mousePosition = {
      baseX: this.inspectorSwitchRef.offsetLeft,
      baseY: this.inspectorSwitchRef.offsetTop,
      moveX: this.getMousePosition(e).x,
      moveY: this.getMousePosition(e).y,
    };
    this.dragging = true;
    e.preventDefault();
  };

  // 结束拖拽
  handleMouseUp = (e: MouseEvent | TouchEvent) => {
    this.hoverSwitch = false;
    if (this.dragging) {
      this.dragging = false;
      if (e instanceof TouchEvent) {
        this.switch(e);
      }
    }
  };

  // 切换开关
  switch = (e: Event) => {
    if (!this.moved) {
      this.open = !this.open;
      e.preventDefault();
      e.stopPropagation();
    }
    this.moved = false;
  };

  /**
   * 组件首次更新完成时的生命周期钩子
   * 用于初始化各种事件监听器
   */
  protected firstUpdated(): void {
    // 打印功能提示信息
    if (!this.hideConsole) {
      this.printTip();
    }

    // 1. 鼠标移动相关事件
    /**
     * handleMouseMove 负责检查模式下的核心逻辑：
     * - 检查是否按下了热键或开关打开
     * - 获取鼠标所在元素的源码位置信息
     * - 调用 renderCover 显示检查覆盖层
     */
    window.addEventListener("mousemove", this.handleMouseMove);
    window.addEventListener("touchmove", this.handleMouseMove);
    // 2. 开关按钮拖拽相关事件
    /**
     * moveSwitch 处理开关按钮的拖拽：
     * - 检查鼠标是否悬停在开关上
     * - 在拖拽状态下更新开关按钮位置
     */
    window.addEventListener("mousemove", this.moveSwitch);
    window.addEventListener("touchmove", this.moveSwitch);
    // 3. 元素点击事件
    /**
     * handleMouseClick 处理元素点击：
     * - 检查是否在检查模式下
     * - 如果点击了有源码信息的元素，则：
     *   - 调用 trackCode 发送请求
     *   - 移除覆盖层
     *   - 根据 autoToggle 决定是否关闭检查模式
     */
    window.addEventListener("click", this.handleMouseClick, true);
    // 4. 处理禁用元素的点击
    /**
     * handlePointerDown 处理被禁用元素的点击：
     * - disabled 的元素无法触发 click 事件
     * - 这个处理器确保对禁用元素也能响应点击
     */

    window.addEventListener("pointerdown", this.handlePointerDown, true);

    // 5. 键盘事件
    /**
     * handleKeyUp 处理按键释放：
     * - 检查热键组合是否还在按下
     * - 如果热键释放且不是开关打开状态，则移除覆盖层
     */
    document.addEventListener("keyup", this.handleKeyUp);

    // 6. 鼠标离开事件
    /**
     * removeCover 清理检查模式：
     * - 隐藏覆盖层
     * - 移除鼠标样式
     * - 恢复文本选择功能
     */
    document.addEventListener("mouseleave", this.removeCover);

    // 7. 鼠标释放事件
    /**
     * handleMouseUp 处理拖拽结束：
     * - 重置悬停状态
     * - 结束拖拽状态
     * - 处理触摸事件的开关切换
     */

    document.addEventListener("mouseup", this.handleMouseUp);
    document.addEventListener("touchend", this.handleMouseUp);
    // 8. 开关按钮的特定事件
    /**
     * recordMousePosition 开始拖拽：
     * - 记录开关按钮的初始位置
     * - 记录鼠标的初始位置
     * - 设置拖拽状态
     */

    this.inspectorSwitchRef.addEventListener(
      "mousedown",
      this.recordMousePosition
    );
    // 监听触摸开始事件
    this.inspectorSwitchRef.addEventListener(
      "touchstart",
      this.recordMousePosition
    );
    // 监听点击事件
    /**
     * switch 处理开关切换：
     * - 如果不是拖拽导致的点击，则切换开关状态
     * - 阻止事件冒泡和默认行为
     */
    this.inspectorSwitchRef.addEventListener("click", this.switch);
  }

  /**
   * 组件断开连接时的生命周期钩子
   * 用于清理事件监听器
   */
  disconnectedCallback(): void {
    window.removeEventListener("mousemove", this.handleMouseMove);
    window.removeEventListener("touchmove", this.handleMouseMove);
    window.removeEventListener("mousemove", this.moveSwitch);
    window.removeEventListener("touchmove", this.moveSwitch);
    window.removeEventListener("click", this.handleMouseClick, true);
    window.removeEventListener("pointerdown", this.handlePointerDown, true);
    document.removeEventListener("keyup", this.handleKeyUp);
    document.removeEventListener("mouseleave", this.removeCover);
    document.removeEventListener("mouseup", this.handleMouseUp);
    document.removeEventListener("touchend", this.handleMouseUp);
    if (this.inspectorSwitchRef) {
      this.inspectorSwitchRef.removeEventListener(
        "mousedown",
        this.recordMousePosition
      );
      this.inspectorSwitchRef.removeEventListener(
        "touchstart",
        this.recordMousePosition
      );
      this.inspectorSwitchRef.removeEventListener("click", this.switch);
    }
  }

  render() {
    const containerPosition = {
      display: this.show ? "block" : "none",
      top: `${this.position.top - this.position.margin.top}px`,
      left: `${this.position.left - this.position.margin.left}px`,
      height: `${
        this.position.bottom -
        this.position.top +
        this.position.margin.bottom +
        this.position.margin.top
      }px`,
      width: `${
        this.position.right -
        this.position.left +
        this.position.margin.right +
        this.position.margin.left
      }px`,
    };
    const marginPosition = {
      borderTopWidth: `${this.position.margin.top}px`,
      borderRightWidth: `${this.position.margin.right}px`,
      borderBottomWidth: `${this.position.margin.bottom}px`,
      borderLeftWidth: `${this.position.margin.left}px`,
    };
    const borderPosition = {
      borderTopWidth: `${this.position.border.top}px`,
      borderRightWidth: `${this.position.border.right}px`,
      borderBottomWidth: `${this.position.border.bottom}px`,
      borderLeftWidth: `${this.position.border.left}px`,
    };
    const paddingPosition = {
      borderTopWidth: `${this.position.padding.top}px`,
      borderRightWidth: `${this.position.padding.right}px`,
      borderBottomWidth: `${this.position.padding.bottom}px`,
      borderLeftWidth: `${this.position.padding.left}px`,
    };
    return html`
      <div
        class="code-inspector-container"
        id="code-inspector-container"
        style=${styleMap(containerPosition)}
      >
        <div class="margin-overlay" style=${styleMap(marginPosition)}>
          <div class="border-overlay" style=${styleMap(borderPosition)}>
            <div class="padding-overlay" style=${styleMap(paddingPosition)}>
              <div class="content-overlay"></div>
            </div>
          </div>
        </div>
        <div
          id="element-info"
          class="element-info ${this.infoClassName.vertical} ${this
            .infoClassName.horizon}"
          style=${styleMap({ width: this.infoWidth })}
        >
          <div class="element-info-content">
            <div class="name-line">
              <div class="element-name">
                <span class="element-title">&lt;${this.element.name}&gt;</span>
                <span class="element-tip">click to open IDE</span>
              </div>
            </div>
            <div class="path-line">${this.element.path}</div>
          </div>
        </div>
      </div>
      <div
        id="inspector-switch"
        class="inspector-switch ${this.open
          ? "active-inspector-switch"
          : ""} ${this.moved ? "move-inspector-switch" : ""}"
        style=${styleMap({ display: this.showSwitch ? "flex" : "none" })}
      >
        ${this.open
          ? html`
              <svg
                t="1677801709811"
                class="icon"
                viewBox="0 0 1024 1024"
                version="1.1"
                xmlns="http://www.w3.org/2000/svg"
                p-id="1110"
                xmlns:xlink="http://www.w3.org/1999/xlink"
                width="1em"
                height="1em"
              >
                <path
                  d="M546.56 704H128c-19.2 0-32-12.8-32-32V256h704v194.56c10.928 1.552 21.648 3.76 32 6.832V128c0-35.2-28.8-64-64-64H128C92.8 64 64 92.8 64 128v544c0 35.2 28.8 64 64 64h425.392a221.936 221.936 0 0 1-6.848-32zM96 128c0-19.2 12.8-32 32-32h640c19.2 0 32 12.8 32 32v96H96V128z"
                  fill="#34495E"
                  p-id="1111"
                ></path>
                <path
                  d="M416 160m-32 0a32 32 0 1 0 64 0 32 32 0 1 0-64 0Z"
                  fill="#00B42A"
                  p-id="1112"
                ></path>
                <path
                  d="M288 160m-32 0a32 32 0 1 0 64 0 32 32 0 1 0-64 0Z"
                  fill="#F7BA1E"
                  p-id="1113"
                ></path>
                <path
                  d="M160 160m-32 0a32 32 0 1 0 64 0 32 32 0 1 0-64 0Z"
                  fill="#F53F3F"
                  p-id="1114"
                ></path>
                <path
                  d="M382.848 658.928l99.376-370.88 30.912 8.272-99.36 370.88zM318.368 319.2L160 477.6l158.4 158.4 22.64-22.624-135.792-135.776 135.776-135.776zM768 480c-13.088 0-25.888 1.344-38.24 3.84l6.24-6.24-158.4-158.4-22.64 22.624 135.792 135.776-135.776 135.776 22.656 22.624 2.208-2.224a190.768 190.768 0 0 0 30.928 148.08l-116.672 116.656c-10.24 10.24-10.24 26.896 0 37.136l27.76 27.76c5.12 5.12 11.84 7.68 18.56 7.68s13.456-2.56 18.56-7.68l120.992-120.96A190.56 190.56 0 0 0 768 864c105.872 0 192-86.128 192-192s-86.128-192-192-192z m-159.12 193.136c0-88.224 71.776-160 160-160 10.656 0 21.04 1.152 31.12 3.152V672c0 19.2-12.8 32-32 32h-156a160.144 160.144 0 0 1-3.12-30.864z m-68.464 263.584l-19.632-19.632 110.336-110.336c6.464 6.656 13.392 12.848 20.752 18.528l-111.456 111.44z m228.464-103.584c-65.92 0-122.576-40.096-147.056-97.136H768c35.2 0 64-28.8 64-64v-145.776c56.896 24.544 96.88 81.12 96.88 146.912 0 88.224-71.776 160-160 160z"
                  fill="#006AFF"
                  p-id="1115"
                ></path>
                <path
                  d="M864.576 672c0 52.928-43.072 96-96 96v32a128 128 0 0 0 128-128h-32z"
                  fill="#34495E"
                  p-id="1116"
                ></path>
              </svg>
            `
          : html`<svg
              t="1677801709811"
              class="icon"
              viewBox="0 0 1024 1024"
              version="1.1"
              xmlns="http://www.w3.org/2000/svg"
              p-id="1110"
              xmlns:xlink="http://www.w3.org/1999/xlink"
              width="1em"
              height="1em"
            >
              <path
                d="M546.56 704H128c-19.2 0-32-12.8-32-32V256h704v194.56c10.928 1.552 21.648 3.76 32 6.832V128c0-35.2-28.8-64-64-64H128C92.8 64 64 92.8 64 128v544c0 35.2 28.8 64 64 64h425.392a221.936 221.936 0 0 1-6.848-32zM96 128c0-19.2 12.8-32 32-32h640c19.2 0 32 12.8 32 32v96H96V128z"
                fill="currentColor"
                p-id="1111"
              ></path>
              <path
                d="M416 160m-32 0a32 32 0 1 0 64 0 32 32 0 1 0-64 0Z"
                fill="currentColor"
                p-id="1112"
              ></path>
              <path
                d="M288 160m-32 0a32 32 0 1 0 64 0 32 32 0 1 0-64 0Z"
                fill="currentColor"
                p-id="1113"
              ></path>
              <path
                d="M160 160m-32 0a32 32 0 1 0 64 0 32 32 0 1 0-64 0Z"
                fill="currentColor"
                p-id="1114"
              ></path>
              <path
                d="M382.848 658.928l99.376-370.88 30.912 8.272-99.36 370.88zM318.368 319.2L160 477.6l158.4 158.4 22.64-22.624-135.792-135.776 135.776-135.776zM768 480c-13.088 0-25.888 1.344-38.24 3.84l6.24-6.24-158.4-158.4-22.64 22.624 135.792 135.776-135.776 135.776 22.656 22.624 2.208-2.224a190.768 190.768 0 0 0 30.928 148.08l-116.672 116.656c-10.24 10.24-10.24 26.896 0 37.136l27.76 27.76c5.12 5.12 11.84 7.68 18.56 7.68s13.456-2.56 18.56-7.68l120.992-120.96A190.56 190.56 0 0 0 768 864c105.872 0 192-86.128 192-192s-86.128-192-192-192z m-159.12 193.136c0-88.224 71.776-160 160-160 10.656 0 21.04 1.152 31.12 3.152V672c0 19.2-12.8 32-32 32h-156a160.144 160.144 0 0 1-3.12-30.864z m-68.464 263.584l-19.632-19.632 110.336-110.336c6.464 6.656 13.392 12.848 20.752 18.528l-111.456 111.44z m228.464-103.584c-65.92 0-122.576-40.096-147.056-97.136H768c35.2 0 64-28.8 64-64v-145.776c56.896 24.544 96.88 81.12 96.88 146.912 0 88.224-71.776 160-160 160z"
                fill="currentColor"
                p-id="1115"
              ></path>
              <path
                d="M864.576 672c0 52.928-43.072 96-96 96v32a128 128 0 0 0 128-128h-32z"
                fill="currentColor"
                p-id="1116"
              ></path>
            </svg>`}
      </div>
    `;
  }

  static styles = css`
    .code-inspector-container {
      position: fixed;
      pointer-events: none;
      z-index: 9999999999999;
      font-family: "PingFang SC";
      .margin-overlay {
        position: absolute;
        inset: 0;
        border-style: solid;
        border-color: rgba(255, 155, 0, 0.3);
        .border-overlay {
          position: absolute;
          inset: 0;
          border-style: solid;
          border-color: rgba(255, 200, 50, 0.3);
          .padding-overlay {
            position: absolute;
            inset: 0;
            border-style: solid;
            border-color: rgba(77, 200, 0, 0.3);
            .content-overlay {
              position: absolute;
              inset: 0;
              background: rgba(120, 170, 210, 0.7);
            }
          }
        }
      }
    }
    .element-info {
      position: absolute;
    }
    .element-info-content {
      max-width: 100%;
      font-size: 12px;
      color: #000;
      background-color: #fff;
      word-break: break-all;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.25);
      box-sizing: border-box;
      padding: 4px 8px;
      border-radius: 4px;
    }
    .element-info-top {
      top: -4px;
      transform: translateY(-100%);
    }
    .element-info-bottom {
      top: calc(100% + 4px);
    }
    .element-info-top-inner {
      top: 4px;
    }
    .element-info-bottom-inner {
      bottom: 4px;
    }
    .element-info-left {
      left: 0;
      display: flex;
      justify-content: flex-start;
    }
    .element-info-right {
      right: 0;
      display: flex;
      justify-content: flex-end;
    }
    .element-name .element-title {
      color: coral;
      font-weight: bold;
    }
    .element-name .element-tip {
      color: #006aff;
    }
    .path-line {
      color: #333;
      line-height: 12px;
      margin-top: 4px;
    }
    .inspector-switch {
      position: fixed;
      z-index: 9999999999999;
      top: 50%;
      right: 24px;
      font-size: 22px;
      transform: translateY(-100%);
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: rgba(255, 255, 255, 0.8);
      color: #555;
      height: 32px;
      width: 32px;
      border-radius: 50%;
      box-shadow: 0px 1px 2px -2px rgba(0, 0, 0, 0.2),
        0px 3px 6px 0px rgba(0, 0, 0, 0.16),
        0px 5px 12px 4px rgba(0, 0, 0, 0.12);
      cursor: pointer;
    }
    .active-inspector-switch {
      color: #006aff;
    }
    .move-inspector-switch {
      cursor: move;
    }
  `;
}

if (!customElements.get("code-inspector-component")) {
  customElements.define("code-inspector-component", CodeInspectorComponent);
}
