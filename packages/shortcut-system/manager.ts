/**
 * 快捷键管理器模块
 */

import { CommandSystem } from '@lavel/command-system';
import {
  IShortcut,
  IShortcutManager,
  IShortcutRegistry,
  IShortcutContext,
  IShortcutSystemConfig,
  IShortcutEventEmitter,
  IKeyModifiers
} from './types';
import { ShortcutRegistry, createShortcutRegistry } from './registry';

/**
 * 检测平台
 */
const detectPlatform = (): 'win' | 'mac' | 'linux' => {
  if (typeof window !== 'undefined' && window.navigator) {
    const platform = window.navigator.platform.toLowerCase();
    if (platform.includes('mac')) return 'mac';
    if (platform.includes('win')) return 'win';
    return 'linux';
  }
  
  // Node.js环境
  if (typeof process !== 'undefined' && process.platform) {
    switch (process.platform) {
      case 'darwin': return 'mac';
      case 'win32': return 'win';
      default: return 'linux';
    }
  }
  
  return 'linux';
};

/**
 * 快捷键管理器实现
 */
export class ShortcutManager implements IShortcutManager {
  private registry: ShortcutRegistry;
  private commandSystem: CommandSystem;
  private config: Required<IShortcutSystemConfig>;
  private context: IShortcutContext;
  private eventEmitter: IShortcutEventEmitter;
  private keydownHandler?: (event: KeyboardEvent) => void;
  private isInitialized: boolean = false;

  constructor(commandSystem: CommandSystem, config: IShortcutSystemConfig = {}) {
    this.commandSystem = commandSystem;
    this.registry = createShortcutRegistry();
    this.eventEmitter = this.registry.getEventEmitter();
    
    // 合并默认配置
    this.config = {
      debug: false,
      platform: detectPlatform(),
      autoHandleEvents: true,
      target: (typeof window !== 'undefined' ? window : null) as any,
      ignoreSelectors: ['input', 'textarea', 'select', '[contenteditable="true"]'],
      formatKey: (key: string) => key.toLowerCase(),
      onError: (error: Error) => console.error('快捷键错误:', error),
      ...config
    } as Required<IShortcutSystemConfig>;

    // 初始化上下文
    this.context = {
      platform: this.config.platform,
      env: {},
      activeElement: typeof document !== 'undefined' ? document.activeElement as HTMLElement : undefined
    };
  }

  /**
   * 初始化快捷键系统
   */
  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    if (this.config.autoHandleEvents && this.config.target) {
      this.keydownHandler = (event: KeyboardEvent) => {
        this.handleKeyEvent(event);
      };
      
      (this.config.target as any).addEventListener('keydown', this.keydownHandler);
    }

    this.isInitialized = true;

    if (this.config.debug) {
      console.log('快捷键系统已初始化', this.config);
    }
  }

  /**
   * 销毁快捷键系统
   */
  destroy(): void {
    if (!this.isInitialized) {
      return;
    }

    if (this.keydownHandler && this.config.target) {
      (this.config.target as any).removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = undefined;
    }

    this.registry.clear();
    this.isInitialized = false;

    if (this.config.debug) {
      console.log('快捷键系统已销毁');
    }
  }

  /**
   * 注册快捷键
   */
  register(shortcut: IShortcut): void {
    // 验证命令是否存在
    if (!this.commandSystem.hasCommand(shortcut.commandName)) {
      throw new Error(`命令 "${shortcut.commandName}" 不存在`);
    }

    this.registry.register(shortcut);

    if (this.config.debug) {
      console.log(`注册快捷键: ${shortcut.id}`, shortcut);
    }
  }

  /**
   * 批量注册快捷键
   */
  registerBatch(shortcuts: IShortcut[]): void {
    shortcuts.forEach(shortcut => this.register(shortcut));
  }

  /**
   * 注销快捷键
   */
  unregister(shortcutId: string): boolean {
    const result = this.registry.unregister(shortcutId);
    
    if (this.config.debug && result) {
      console.log(`注销快捷键: ${shortcutId}`);
    }

    return result;
  }

  /**
   * 启用快捷键
   */
  enable(shortcutId: string): boolean {
    return this.registry.enable(shortcutId);
  }

  /**
   * 禁用快捷键
   */
  disable(shortcutId: string): boolean {
    return this.registry.disable(shortcutId);
  }

  /**
   * 从键盘事件中提取修饰键
   */
  private extractModifiers(event: KeyboardEvent): IKeyModifiers {
    return {
      ctrl: event.ctrlKey,
      alt: event.altKey,
      shift: event.shiftKey,
      meta: event.metaKey,
      ctrlOrCmd: this.config.platform === 'mac' ? event.metaKey : event.ctrlKey
    };
  }

  /**
   * 检查是否应该忽略事件
   */
  private shouldIgnoreEvent(event: KeyboardEvent): boolean {
    const target = event.target as HTMLElement;
    
    if (!target) {
      return false;
    }

    // 检查忽略的选择器
    for (const selector of this.config.ignoreSelectors) {
      if (target.matches(selector)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 处理键盘事件
   */
  handleKeyEvent(event: KeyboardEvent): boolean {
    // 忽略某些元素上的事件
    if (this.shouldIgnoreEvent(event)) {
      return false;
    }

    // 提取按键和修饰键
    const key = this.config.formatKey(event.key);
    const modifiers = this.extractModifiers(event);

    // 查找匹配的快捷键
    const shortcut = this.registry.getByKeys(key, modifiers);
    
    if (!shortcut || !shortcut.enabled) {
      return false;
    }

    // 更新上下文
    this.context.activeElement = event.target as HTMLElement;

    // 检查执行条件
    if (shortcut.when && !shortcut.when(this.context)) {
      return false;
    }

    // 触发快捷键事件
    this.eventEmitter.emit({
      type: 'shortcut.triggered',
      shortcutId: shortcut.id,
      shortcut,
      timestamp: Date.now(),
      data: { event }
    });

    // 阻止默认行为
    if (shortcut.preventDefault) {
      event.preventDefault();
    }

    // 阻止事件传播
    if (shortcut.stopPropagation) {
      event.stopPropagation();
    }

    // 执行命令
    this.executeShortcut(shortcut);

    return true;
  }

  /**
   * 执行快捷键对应的命令
   */
  private async executeShortcut(shortcut: IShortcut): Promise<void> {
    try {
      // 构建命令上下文
      const commandContext = {
        args: shortcut.commandArgs || {},
        env: this.context.env,
        user: this.context.user,
        ...shortcut.commandContext
      };

      // 执行命令
      const result = await this.commandSystem.execute(
        shortcut.commandName,
        commandContext
      );

      // 触发执行完成事件
      this.eventEmitter.emit({
        type: 'shortcut.executed',
        shortcutId: shortcut.id,
        shortcut,
        timestamp: Date.now(),
        data: { result }
      });

      if (this.config.debug) {
        console.log(`快捷键 ${shortcut.id} 执行完成:`, result);
      }

    } catch (error) {
      // 触发错误事件
      this.eventEmitter.emit({
        type: 'shortcut.error',
        shortcutId: shortcut.id,
        shortcut,
        timestamp: Date.now(),
        error: error as Error
      });

      // 调用错误处理器
      this.config.onError(error as Error, shortcut);
    }
  }

  /**
   * 获取注册表
   */
  getRegistry(): IShortcutRegistry {
    return this.registry;
  }

  /**
   * 设置上下文
   */
  setContext(context: Partial<IShortcutContext>): void {
    this.context = {
      ...this.context,
      ...context
    };
  }

  /**
   * 获取当前上下文
   */
  getContext(): IShortcutContext {
    return { ...this.context };
  }

  /**
   * 获取事件发射器
   */
  getEventEmitter(): IShortcutEventEmitter {
    return this.eventEmitter;
  }
}

/**
 * 创建快捷键管理器实例
 */
export const createShortcutManager = (
  commandSystem: CommandSystem,
  config?: IShortcutSystemConfig
): ShortcutManager => {
  return new ShortcutManager(commandSystem, config);
};

/**
 * 内置快捷键方案
 */
export const builtinShortcuts = {
  /**
   * 撤销/重做快捷键
   */
  undoRedo: (): IShortcut[] => [
    {
      id: 'undo',
      description: '撤销',
      keys: 'z',
      modifiers: { ctrlOrCmd: true },
      commandName: 'undo',
      category: 'edit',
      priority: 100
    },
    {
      id: 'redo',
      description: '重做',
      keys: 'z',
      modifiers: { ctrlOrCmd: true, shift: true },
      commandName: 'redo',
      category: 'edit',
      priority: 100
    }
  ],

  /**
   * 文本编辑快捷键
   */
  textEdit: (): IShortcut[] => [
    {
      id: 'copy',
      description: '复制',
      keys: 'c',
      modifiers: { ctrlOrCmd: true },
      commandName: 'copy',
      category: 'edit',
      priority: 90
    },
    {
      id: 'cut',
      description: '剪切',
      keys: 'x',
      modifiers: { ctrlOrCmd: true },
      commandName: 'cut',
      category: 'edit',
      priority: 90
    },
    {
      id: 'paste',
      description: '粘贴',
      keys: 'v',
      modifiers: { ctrlOrCmd: true },
      commandName: 'paste',
      category: 'edit',
      priority: 90
    },
    {
      id: 'selectAll',
      description: '全选',
      keys: 'a',
      modifiers: { ctrlOrCmd: true },
      commandName: 'selectAll',
      category: 'edit',
      priority: 90
    }
  ],

  /**
   * 文件操作快捷键
   */
  fileOperations: (): IShortcut[] => [
    {
      id: 'save',
      description: '保存',
      keys: 's',
      modifiers: { ctrlOrCmd: true },
      commandName: 'save',
      category: 'file',
      priority: 100
    },
    {
      id: 'saveAs',
      description: '另存为',
      keys: 's',
      modifiers: { ctrlOrCmd: true, shift: true },
      commandName: 'saveAs',
      category: 'file',
      priority: 100
    },
    {
      id: 'open',
      description: '打开',
      keys: 'o',
      modifiers: { ctrlOrCmd: true },
      commandName: 'open',
      category: 'file',
      priority: 100
    },
    {
      id: 'new',
      description: '新建',
      keys: 'n',
      modifiers: { ctrlOrCmd: true },
      commandName: 'new',
      category: 'file',
      priority: 100
    }
  ]
};

// CommonJS导出
module.exports = {
  ShortcutManager,
  createShortcutManager,
  builtinShortcuts
}; 