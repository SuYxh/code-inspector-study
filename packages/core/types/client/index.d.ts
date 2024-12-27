import { LitElement } from "lit";
export declare class CodeInspectorComponent extends LitElement {
    /** 激活检查模式的组合键，多个键用逗号分隔，如 'shiftKey,altKey' */
    hotKeys: string;
    /** 本地服务端口 */
    port: number;
    /** 是否展示开关按钮 */
    showSwitch: boolean;
    /** 点击元素后是否自动关闭检查模式 */
    autoToggle: boolean;
    /** 是否隐藏控制台 */
    hideConsole: boolean;
    /** 是否启用IDE定位功能 */
    locate: boolean;
    /** 是否启用复制功能，可以是布尔值或复制格式字符串 */
    copy: boolean | string;
    /** 本地服务IP */
    ip: string;
    /**
     * 当前选中元素的位置信息
     * 包含元素的位置(top/right/bottom/left)
     * 以及padding/border/margin的尺寸
     */
    position: {
        top: number;
        right: number;
        bottom: number;
        left: number;
        padding: {
            top: number;
            right: number;
            bottom: number;
            left: number;
        };
        border: {
            top: number;
            right: number;
            bottom: number;
            left: number;
        };
        margin: {
            top: number;
            right: number;
            bottom: number;
            left: number;
        };
    };
    /** 选中节点的信息，包含组件名称、代码行列号和文件路径 */
    element: {
        name: string;
        line: number;
        column: number;
        path: string;
    };
    /** 信息浮块的位置类名，控制显示在元素的上下左右 */
    infoClassName: {
        vertical: string;
        horizon: string;
    };
    /** 信息浮块宽度 */
    infoWidth: string;
    /** 是否显示检查器UI */
    show: boolean;
    /** 是否正在拖拽开关按钮 */
    dragging: boolean;
    /**
     * 鼠标拖拽相关位置信息
     * baseX/baseY: 开关按钮的初始位置
     * moveX/moveY: 鼠标移动的位置
     */
    mousePosition: {
        baseX: number;
        baseY: number;
        moveX: number;
        moveY: number;
    };
    /** 是否通过开关按钮打开检查模式 */
    open: boolean;
    /** 开关按钮是否被移动过 */
    moved: boolean;
    /** 鼠标是否悬停在开关按钮上 */
    hoverSwitch: boolean;
    /** 保存body原始的userSelect样式值 */
    preUserSelect: string;
    /**
     * 发送请求的方式
     * xhr: 使用XMLHttpRequest
     * img: 使用Image对象(用于处理某些环境下XHR被拦截的情况)
     */
    sendType: "xhr" | "img";
    /** 开关按钮的DOM引用 */
    inspectorSwitchRef: HTMLDivElement;
    /**
     * 检查当前按键组合是否匹配配置的热键
     * @param e - 键盘或鼠标事件对象
     * @returns {boolean} 如果当前按键组合匹配配置的热键则返回true
     * @example
     * 如果hotKeys为'shiftKey,altKey'
     * 当同时按下shift和alt键时返回true
     * isTracking(event) // => true
     */
    isTracking: (e: any) => boolean | "";
    /**
     * 获取DOM元素的计算样式值并转换为数字
     * @param target - 目标DOM元素
     * @param property - CSS属性名
     * @returns {number} 返回去除'px'单位后的数值
     * @example
     * 如果元素的padding-top为'20px'
     * getDomPropertyValue(element, 'padding-top') // => 20
     */
    getDomPropertyValue: (target: HTMLElement, property: string) => number;
    /**
     * 渲染元素的检查覆盖层
     * 包括元素的位置信息、盒模型尺寸、信息浮层位置等
     * @param target - 目标DOM元素
     */
    renderCover: (target: HTMLElement) => void;
    /**
     * 移除检查覆盖层
     * 清除检查模式相关的UI和样式
     */
    removeCover: () => void;
    /**
     * 添加全局鼠标指针样式
     * 为所有元素添加pointer光标样式
     * 通过动态创建style标签实现
     */
    addGlobalCursorStyle: () => void;
    /**
     * 移除全局鼠标指针样式
     * 删除之前添加的样式标签
     */
    removeGlobalCursorStyle: () => void;
    /**
     * 通过XMLHttpRequest发送请求到本地服务
     * 用于在IDE中打开对应的源代码文件
     * 如果XHR请求失败，会自动切换到img方式发送请求
     */
    sendXHR: () => void;
    /**
     * 通过创建img标签的方式发送请求
     * 这是一个备选方案，用于处理XHR被拦截的情况
     * 常见于企业微信侧边栏等内置浏览器环境
     *
     * 原理：浏览器会自动请求img的src，可以绕过一些XHR限制
     * 虽然请求会失败（因为返回的不是图片），但请求已经发出去了
     */
    sendImg: () => void;
    /**
     * 处理代码追踪功能
     * 1. 如果启用了locate功能，发送请求到本地服务打开IDE
     * 2. 如果启用了copy功能，复制格式化后的路径到剪贴板
     */
    trackCode: () => void;
    /**
     * 将文本复制到剪贴板
     * 优先使用现代的Clipboard API
     * 降级使用传统的document.execCommand方法
     *
     * @param text - 要复制的文本内容
     */
    copyToClipboard(text: string): void;
    moveSwitch: (e: MouseEvent | TouchEvent) => void;
    isSamePositionNode: (node1: HTMLElement, node2: HTMLElement) => boolean;
    /**
     * 处理鼠标/触摸移动事件
     * 用于在检查模式下实时更新覆盖层位置
     * @param e - 鼠标或触摸事件对象
     */
    handleMouseMove: (e: MouseEvent | TouchEvent) => void;
    handleMouseClick: (e: MouseEvent | TouchEvent) => void;
    /**
     * 处理被禁用元素的点击事件
     * 因为disabled的元素无法触发click事件，所以需要特殊处理
     * @param e - 指针事件对象
     */
    handlePointerDown: (e: PointerEvent) => void;
    handleKeyUp: (e: KeyboardEvent) => void;
    printTip: () => void;
    getMousePosition: (e: MouseEvent | TouchEvent) => {
        x: number;
        y: number;
    };
    recordMousePosition: (e: MouseEvent | TouchEvent) => void;
    handleMouseUp: (e: MouseEvent | TouchEvent) => void;
    switch: (e: Event) => void;
    /**
     * 组件首次更新完成时的生命周期钩子
     * 用于初始化各种事件监听器
     */
    protected firstUpdated(): void;
    /**
     * 组件断开连接时的生命周期钩子
     * 用于清理事件监听器
     */
    disconnectedCallback(): void;
    render(): import("lit").TemplateResult<1>;
    static styles: import("lit").CSSResult;
}
