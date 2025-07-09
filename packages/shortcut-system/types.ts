/**
 * 快捷键系统类型定义
 */

import { ICommandContext } from '@lavel/command-system';

/**
 * 按键修饰符
 */
export interface IKeyModifiers {
  /** Ctrl键(Windows/Linux) 或 Cmd键(Mac) */
  ctrlOrCmd?: boolean;
  /** Ctrl键 */
  ctrl?: boolean;
  /** Alt键 */
  alt?: boolean;
  /** Shift键 */
  shift?: boolean;
  /** Meta键(Windows键/Cmd键) */
  meta?: boolean;
}

/**
 * 快捷键定义
 */
export interface IShortcut {
  /** 快捷键ID */
  id: string;
  /** 快捷键描述 */
  description: string;
  /** 快捷键组合 */
  keys: string;
  /** 修饰键 */
  modifiers?: IKeyModifiers;
  /** 关联的命令名称 */
  commandName: string;
  /** 命令参数 */
  commandArgs?: Record<string, any>;
  /** 命令上下文 */
  commandContext?: Partial<ICommandContext>;
  /** 分组/类别 */
  category?: string;
  /** 是否启用 */
  enabled?: boolean;
  /** 执行条件 */
  when?: (context: IShortcutContext) => boolean;
  /** 优先级(数字越大优先级越高) */
  priority?: number;
  /** 是否阻止默认行为 */
  preventDefault?: boolean;
  /** 是否阻止事件传播 */
  stopPropagation?: boolean;
}

/**
 * 快捷键上下文
 */
export interface IShortcutContext {
  /** 当前焦点元素 */
  activeElement?: HTMLElement;
  /** 当前平台 */
  platform: 'win' | 'mac' | 'linux';
  /** 当前环境 */
  env: Record<string, any>;
  /** 用户信息 */
  user?: {
    id: string;
    permissions: string[];
  };
}

/**
 * 快捷键注册表接口
 */
export interface IShortcutRegistry {
  /** 注册快捷键 */
  register(shortcut: IShortcut): void;
  /** 批量注册快捷键 */
  registerBatch(shortcuts: IShortcut[]): void;
  /** 注销快捷键 */
  unregister(shortcutId: string): boolean;
  /** 通过按键获取快捷键 */
  getByKeys(keys: string, modifiers?: IKeyModifiers): IShortcut | undefined;
  /** 通过ID获取快捷键 */
  getById(shortcutId: string): IShortcut | undefined;
  /** 通过命令名获取快捷键列表 */
  getByCommand(commandName: string): IShortcut[];
  /** 获取所有快捷键 */
  getAll(): IShortcut[];
  /** 根据分类获取快捷键 */
  getByCategory(category: string): IShortcut[];
  /** 检查快捷键是否存在 */
  has(shortcutId: string): boolean;
  /** 检查按键组合是否被占用 */
  isKeysTaken(keys: string, modifiers?: IKeyModifiers): boolean;
  /** 启用快捷键 */
  enable(shortcutId: string): boolean;
  /** 禁用快捷键 */
  disable(shortcutId: string): boolean;
  /** 清空所有快捷键 */
  clear(): void;
  /** 获取统计信息 */
  getStats(): {
    totalShortcuts: number;
    enabledShortcuts: number;
    disabledShortcuts: number;
    totalCategories: number;
    totalCommands: number;
    keyMappings: number;
  };
}

/**
 * 快捷键管理器接口
 */
export interface IShortcutManager {
  /** 初始化快捷键系统 */
  initialize(): void;
  /** 销毁快捷键系统 */
  destroy(): void;
  /** 注册快捷键 */
  register(shortcut: IShortcut): void;
  /** 批量注册快捷键 */
  registerBatch(shortcuts: IShortcut[]): void;
  /** 注销快捷键 */
  unregister(shortcutId: string): boolean;
  /** 启用快捷键 */
  enable(shortcutId: string): boolean;
  /** 禁用快捷键 */
  disable(shortcutId: string): boolean;
  /** 处理键盘事件 */
  handleKeyEvent(event: KeyboardEvent): boolean;
  /** 获取注册表 */
  getRegistry(): IShortcutRegistry;
  /** 设置上下文 */
  setContext(context: Partial<IShortcutContext>): void;
  /** 获取当前上下文 */
  getContext(): IShortcutContext;
}

/**
 * 快捷键系统配置
 */
export interface IShortcutSystemConfig {
  /** 是否启用调试模式 */
  debug?: boolean;
  /** 平台 */
  platform?: 'win' | 'mac' | 'linux';
  /** 是否自动处理键盘事件 */
  autoHandleEvents?: boolean;
  /** 事件目标元素 */
  target?: HTMLElement | Window;
  /** 忽略的元素选择器 */
  ignoreSelectors?: string[];
  /** 自定义按键格式化函数 */
  formatKey?: (key: string) => string;
  /** 错误处理器 */
  onError?: (error: Error, shortcut: IShortcut) => void;
}

/**
 * 事件类型
 */
export type ShortcutEventType = 
  | 'shortcut.registered'
  | 'shortcut.unregistered'
  | 'shortcut.triggered'
  | 'shortcut.executed'
  | 'shortcut.error'
  | 'shortcut.enabled'
  | 'shortcut.disabled';

/**
 * 快捷键事件
 */
export interface IShortcutEvent {
  /** 事件类型 */
  type: ShortcutEventType;
  /** 快捷键ID */
  shortcutId?: string;
  /** 快捷键 */
  shortcut?: IShortcut;
  /** 事件时间戳 */
  timestamp: number;
  /** 事件数据 */
  data?: any;
  /** 错误信息 */
  error?: Error;
}

/**
 * 事件监听器类型
 */
export type ShortcutEventListener = (event: IShortcutEvent) => void;

/**
 * 事件发射器接口
 */
export interface IShortcutEventEmitter {
  /** 添加事件监听器 */
  on(eventType: ShortcutEventType, listener: ShortcutEventListener): void;
  /** 移除事件监听器 */
  off(eventType: ShortcutEventType, listener: ShortcutEventListener): void;
  /** 触发事件 */
  emit(event: IShortcutEvent): void;
}

/**
 * 快捷键方案
 */
export interface IShortcutScheme {
  /** 方案名称 */
  name: string;
  /** 方案描述 */
  description: string;
  /** 快捷键列表 */
  shortcuts: IShortcut[];
  /** 是否为默认方案 */
  isDefault?: boolean;
}

/**
 * 快捷键冲突信息
 */
export interface IShortcutConflict {
  /** 新快捷键 */
  newShortcut: IShortcut;
  /** 现有快捷键 */
  existingShortcut: IShortcut;
  /** 冲突的按键组合 */
  keys: string;
  /** 冲突的修饰键 */
  modifiers?: IKeyModifiers;
}

/**
 * 快捷键验证结果
 */
export interface IShortcutValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误列表 */
  errors: string[];
  /** 警告列表 */
  warnings: string[];
  /** 冲突列表 */
  conflicts: IShortcutConflict[];
}

// 使用CommonJS导出
module.exports = {
  // 导出所有类型和接口
}; 