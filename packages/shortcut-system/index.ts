/**
 * 快捷键系统入口模块
 */

// 导出所有类型定义
export * from './types';

// 导出核心类
export { ShortcutRegistry, createShortcutRegistry } from './registry';
export { ShortcutManager, createShortcutManager, builtinShortcuts } from './manager';

// 导入依赖
import { CommandSystem, ICommandContext } from '@lavel/command-system';
import { UndoSystem } from '@lavel/undo-system';
import { ShortcutManager, createShortcutManager, builtinShortcuts } from './manager';
import { 
  IShortcutSystemConfig,
  IShortcut,
  IShortcutScheme,
  IShortcutValidationResult,
  IShortcutConflict
} from './types';

/**
 * 快捷键系统主类
 * 提供与命令系统和撤销系统的集成
 */
export class ShortcutSystem {
  private shortcutManager: ShortcutManager;
  private commandSystem: CommandSystem;
  private undoSystem?: UndoSystem;
  private config: IShortcutSystemConfig;

  constructor(
    commandSystem: CommandSystem,
    config: IShortcutSystemConfig = {},
    undoSystem?: UndoSystem
  ) {
    this.commandSystem = commandSystem;
    this.undoSystem = undoSystem;
    this.config = config;
    this.shortcutManager = createShortcutManager(commandSystem, config);
  }

  /**
   * 初始化快捷键系统
   */
  initialize(): void {
    this.shortcutManager.initialize();

    // 如果有撤销系统，自动注册撤销/重做快捷键
    if (this.undoSystem) {
      this.registerUndoShortcuts();
    }
  }

  /**
   * 销毁快捷键系统
   */
  destroy(): void {
    this.shortcutManager.destroy();
  }

  /**
   * 注册快捷键
   */
  register(shortcut: IShortcut): void {
    this.shortcutManager.register(shortcut);
  }

  /**
   * 批量注册快捷键
   */
  registerBatch(shortcuts: IShortcut[]): void {
    this.shortcutManager.registerBatch(shortcuts);
  }

  /**
   * 注册快捷键方案
   */
  registerScheme(scheme: IShortcutScheme): void {
    this.registerBatch(scheme.shortcuts);
  }

  /**
   * 注销快捷键
   */
  unregister(shortcutId: string): boolean {
    return this.shortcutManager.unregister(shortcutId);
  }

  /**
   * 启用快捷键
   */
  enable(shortcutId: string): boolean {
    return this.shortcutManager.enable(shortcutId);
  }

  /**
   * 禁用快捷键
   */
  disable(shortcutId: string): boolean {
    return this.shortcutManager.disable(shortcutId);
  }

  /**
   * 注册撤销系统快捷键
   */
  private registerUndoShortcuts(): void {
    const undoShortcuts = builtinShortcuts.undoRedo();
    this.registerBatch(undoShortcuts);
  }

  /**
   * 获取快捷键管理器
   */
  getManager(): ShortcutManager {
    return this.shortcutManager;
  }

  /**
   * 获取快捷键注册表
   */
  getRegistry() {
    return this.shortcutManager.getRegistry();
  }

  /**
   * 验证快捷键配置
   */
  validateShortcut(shortcut: IShortcut): IShortcutValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const conflicts: IShortcutConflict[] = [];

    // 验证必填字段
    if (!shortcut.id) {
      errors.push('快捷键ID不能为空');
    }
    if (!shortcut.keys) {
      errors.push('快捷键按键不能为空');
    }
    if (!shortcut.commandName) {
      errors.push('命令名称不能为空');
    }

    // 检查命令是否存在
    if (shortcut.commandName && !this.commandSystem.hasCommand(shortcut.commandName)) {
      warnings.push(`命令 "${shortcut.commandName}" 不存在`);
    }

    // 检查按键冲突
    const registry = this.shortcutManager.getRegistry();
    if (shortcut.keys && registry.isKeysTaken(shortcut.keys, shortcut.modifiers)) {
      const existing = registry.getByKeys(shortcut.keys, shortcut.modifiers);
      if (existing && existing.id !== shortcut.id) {
        conflicts.push({
          newShortcut: shortcut,
          existingShortcut: existing,
          keys: shortcut.keys,
          modifiers: shortcut.modifiers
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      conflicts
    };
  }

  /**
   * 获取所有快捷键
   */
  getAllShortcuts(): IShortcut[] {
    return this.shortcutManager.getRegistry().getAll();
  }

  /**
   * 根据分类获取快捷键
   */
  getShortcutsByCategory(category: string): IShortcut[] {
    return this.shortcutManager.getRegistry().getByCategory(category);
  }

  /**
   * 根据命令获取快捷键
   */
  getShortcutsByCommand(commandName: string): IShortcut[] {
    return this.shortcutManager.getRegistry().getByCommand(commandName);
  }

  /**
   * 导出快捷键配置
   */
  exportShortcuts(): IShortcutScheme {
    return {
      name: 'exported',
      description: '导出的快捷键配置',
      shortcuts: this.getAllShortcuts()
    };
  }

  /**
   * 导入快捷键配置
   */
  importShortcuts(scheme: IShortcutScheme, replace: boolean = false): void {
    if (replace) {
      // 清空现有快捷键
      this.shortcutManager.getRegistry().clear();
    }

    // 注册新快捷键
    this.registerScheme(scheme);
  }
}

/**
 * 创建快捷键系统实例
 */
export const createShortcutSystem = (
  commandSystem: CommandSystem,
  config?: IShortcutSystemConfig,
  undoSystem?: UndoSystem
): ShortcutSystem => {
  return new ShortcutSystem(commandSystem, config, undoSystem);
};

/**
 * 默认快捷键方案
 */
export const defaultShortcutSchemes = {
  /**
   * 基础编辑方案
   */
  basicEdit: (): IShortcutScheme => ({
    name: 'basicEdit',
    description: '基础编辑快捷键',
    shortcuts: [
      ...builtinShortcuts.undoRedo(),
      ...builtinShortcuts.textEdit()
    ]
  }),

  /**
   * 文件操作方案
   */
  fileOperations: (): IShortcutScheme => ({
    name: 'fileOperations',
    description: '文件操作快捷键',
    shortcuts: builtinShortcuts.fileOperations()
  }),

  /**
   * 完整方案
   */
  full: (): IShortcutScheme => ({
    name: 'full',
    description: '完整快捷键方案',
    shortcuts: [
      ...builtinShortcuts.undoRedo(),
      ...builtinShortcuts.textEdit(),
      ...builtinShortcuts.fileOperations()
    ],
    isDefault: true
  })
};

/**
 * 快捷键助手函数
 */
export const shortcutHelpers = {
  /**
   * 格式化快捷键显示
   */
  formatShortcut: (shortcut: IShortcut, platform?: 'win' | 'mac' | 'linux'): string => {
    const parts: string[] = [];
    const p = platform || (typeof process !== 'undefined' ? (process.platform === 'darwin' ? 'mac' : 'win') : 'win');
    
    if (shortcut.modifiers) {
      if (shortcut.modifiers.ctrlOrCmd) {
        parts.push(p === 'mac' ? '⌘' : 'Ctrl');
      } else if (shortcut.modifiers.ctrl) {
        parts.push('Ctrl');
      }
      
      if (shortcut.modifiers.alt) {
        parts.push(p === 'mac' ? '⌥' : 'Alt');
      }
      
      if (shortcut.modifiers.shift) {
        parts.push(p === 'mac' ? '⇧' : 'Shift');
      }
      
      if (shortcut.modifiers.meta) {
        parts.push(p === 'mac' ? '⌘' : 'Win');
      }
    }
    
    parts.push(shortcut.keys.toUpperCase());
    
    return parts.join(p === 'mac' ? '' : '+');
  },

  /**
   * 解析快捷键字符串
   */
  parseShortcut: (shortcutString: string): { keys: string; modifiers: any } => {
    const parts = shortcutString.toLowerCase().split('+').map(s => s.trim());
    const keys = parts[parts.length - 1];
    const modifiers: any = {};
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      switch (part) {
        case 'ctrl':
        case 'control':
          modifiers.ctrl = true;
          break;
        case 'cmd':
        case 'command':
        case 'meta':
          modifiers.meta = true;
          break;
        case 'alt':
        case 'option':
          modifiers.alt = true;
          break;
        case 'shift':
          modifiers.shift = true;
          break;
        case 'ctrlorcmd':
          modifiers.ctrlOrCmd = true;
          break;
      }
    }
    
    return { keys, modifiers };
  },

  /**
   * 创建快捷键
   */
  createShortcut: (
    id: string,
    shortcutString: string,
    commandName: string,
    options: Partial<IShortcut> = {}
  ): IShortcut => {
    const { keys, modifiers } = shortcutHelpers.parseShortcut(shortcutString);
    
    return {
      id,
      description: options.description || id,
      keys,
      modifiers,
      commandName,
      ...options
    };
  }
};

// CommonJS导出
module.exports = {
  ShortcutSystem,
  createShortcutSystem,
  defaultShortcutSchemes,
  shortcutHelpers,
  // 重新导出核心模块
  ShortcutRegistry: require('./registry').ShortcutRegistry,
  createShortcutRegistry: require('./registry').createShortcutRegistry,
  ShortcutManager: require('./manager').ShortcutManager,
  createShortcutManager: require('./manager').createShortcutManager,
  builtinShortcuts: require('./manager').builtinShortcuts
}; 