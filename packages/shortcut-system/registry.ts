/**
 * 快捷键注册表模块
 */

import {
  IShortcut,
  IShortcutRegistry,
  IKeyModifiers,
  IShortcutEventEmitter,
  IShortcutEvent,
  ShortcutEventType,
  ShortcutEventListener
} from './types';

/**
 * 事件发射器实现
 */
class ShortcutEventEmitter implements IShortcutEventEmitter {
  private listeners: Map<ShortcutEventType, Set<ShortcutEventListener>>;

  constructor() {
    this.listeners = new Map();
  }

  on(eventType: ShortcutEventType, listener: ShortcutEventListener): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);
  }

  off(eventType: ShortcutEventType, listener: ShortcutEventListener): void {
    const typeListeners = this.listeners.get(eventType);
    if (typeListeners) {
      typeListeners.delete(listener);
    }
  }

  emit(event: IShortcutEvent): void {
    const typeListeners = this.listeners.get(event.type);
    if (typeListeners) {
      typeListeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error(`事件监听器执行失败:`, error);
        }
      });
    }
  }
}

/**
 * 快捷键注册表实现
 */
export class ShortcutRegistry implements IShortcutRegistry {
  private shortcuts: Map<string, IShortcut>;
  private keyMapping: Map<string, string>; // key组合 -> shortcutId
  private commandMapping: Map<string, Set<string>>; // commandName -> Set<shortcutId>
  private categoryMapping: Map<string, Set<string>>; // category -> Set<shortcutId>
  private eventEmitter: IShortcutEventEmitter;

  constructor() {
    this.shortcuts = new Map();
    this.keyMapping = new Map();
    this.commandMapping = new Map();
    this.categoryMapping = new Map();
    this.eventEmitter = new ShortcutEventEmitter();
  }

  /**
   * 生成按键组合的唯一标识
   */
  private generateKeyId(keys: string, modifiers?: IKeyModifiers): string {
    const parts: string[] = [];
    
    if (modifiers) {
      if (modifiers.ctrlOrCmd || modifiers.ctrl) parts.push('ctrl');
      if (modifiers.alt) parts.push('alt');
      if (modifiers.shift) parts.push('shift');
      if (modifiers.meta) parts.push('meta');
    }
    
    parts.push(keys.toLowerCase());
    return parts.join('+');
  }

  /**
   * 注册快捷键
   */
  register(shortcut: IShortcut): void {
    // 检查ID是否已存在
    if (this.shortcuts.has(shortcut.id)) {
      throw new Error(`快捷键ID "${shortcut.id}" 已存在`);
    }

    // 检查按键组合是否已被占用
    const keyId = this.generateKeyId(shortcut.keys, shortcut.modifiers);
    if (this.keyMapping.has(keyId)) {
      const existingId = this.keyMapping.get(keyId)!;
      const existing = this.shortcuts.get(existingId)!;
      throw new Error(
        `按键组合 "${keyId}" 已被快捷键 "${existing.id}" 占用`
      );
    }

    // 设置默认值
    const normalizedShortcut: IShortcut = {
      ...shortcut,
      enabled: shortcut.enabled !== false,
      priority: shortcut.priority || 0,
      preventDefault: shortcut.preventDefault !== false,
      stopPropagation: shortcut.stopPropagation !== false
    };

    // 存储快捷键
    this.shortcuts.set(shortcut.id, normalizedShortcut);
    this.keyMapping.set(keyId, shortcut.id);

    // 更新命令映射
    if (!this.commandMapping.has(shortcut.commandName)) {
      this.commandMapping.set(shortcut.commandName, new Set());
    }
    this.commandMapping.get(shortcut.commandName)!.add(shortcut.id);

    // 更新分类映射
    if (shortcut.category) {
      if (!this.categoryMapping.has(shortcut.category)) {
        this.categoryMapping.set(shortcut.category, new Set());
      }
      this.categoryMapping.get(shortcut.category)!.add(shortcut.id);
    }

    // 触发事件
    this.eventEmitter.emit({
      type: 'shortcut.registered',
      shortcutId: shortcut.id,
      shortcut: normalizedShortcut,
      timestamp: Date.now()
    });
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
    const shortcut = this.shortcuts.get(shortcutId);
    if (!shortcut) {
      return false;
    }

    // 移除快捷键
    this.shortcuts.delete(shortcutId);

    // 移除按键映射
    const keyId = this.generateKeyId(shortcut.keys, shortcut.modifiers);
    this.keyMapping.delete(keyId);

    // 更新命令映射
    const commandShortcuts = this.commandMapping.get(shortcut.commandName);
    if (commandShortcuts) {
      commandShortcuts.delete(shortcutId);
      if (commandShortcuts.size === 0) {
        this.commandMapping.delete(shortcut.commandName);
      }
    }

    // 更新分类映射
    if (shortcut.category) {
      const categoryShortcuts = this.categoryMapping.get(shortcut.category);
      if (categoryShortcuts) {
        categoryShortcuts.delete(shortcutId);
        if (categoryShortcuts.size === 0) {
          this.categoryMapping.delete(shortcut.category);
        }
      }
    }

    // 触发事件
    this.eventEmitter.emit({
      type: 'shortcut.unregistered',
      shortcutId,
      shortcut,
      timestamp: Date.now()
    });

    return true;
  }

  /**
   * 通过按键获取快捷键
   */
  getByKeys(keys: string, modifiers?: IKeyModifiers): IShortcut | undefined {
    const keyId = this.generateKeyId(keys, modifiers);
    const shortcutId = this.keyMapping.get(keyId);
    return shortcutId ? this.shortcuts.get(shortcutId) : undefined;
  }

  /**
   * 通过ID获取快捷键
   */
  getById(shortcutId: string): IShortcut | undefined {
    return this.shortcuts.get(shortcutId);
  }

  /**
   * 通过命令名获取快捷键列表
   */
  getByCommand(commandName: string): IShortcut[] {
    const shortcutIds = this.commandMapping.get(commandName);
    if (!shortcutIds) {
      return [];
    }
    
    return Array.from(shortcutIds)
      .map(id => this.shortcuts.get(id)!)
      .filter(Boolean);
  }

  /**
   * 获取所有快捷键
   */
  getAll(): IShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * 根据分类获取快捷键
   */
  getByCategory(category: string): IShortcut[] {
    const shortcutIds = this.categoryMapping.get(category);
    if (!shortcutIds) {
      return [];
    }
    
    return Array.from(shortcutIds)
      .map(id => this.shortcuts.get(id)!)
      .filter(Boolean);
  }

  /**
   * 检查快捷键是否存在
   */
  has(shortcutId: string): boolean {
    return this.shortcuts.has(shortcutId);
  }

  /**
   * 检查按键组合是否被占用
   */
  isKeysTaken(keys: string, modifiers?: IKeyModifiers): boolean {
    const keyId = this.generateKeyId(keys, modifiers);
    return this.keyMapping.has(keyId);
  }

  /**
   * 启用快捷键
   */
  enable(shortcutId: string): boolean {
    const shortcut = this.shortcuts.get(shortcutId);
    if (!shortcut) {
      return false;
    }

    shortcut.enabled = true;

    // 触发事件
    this.eventEmitter.emit({
      type: 'shortcut.enabled',
      shortcutId,
      shortcut,
      timestamp: Date.now()
    });

    return true;
  }

  /**
   * 禁用快捷键
   */
  disable(shortcutId: string): boolean {
    const shortcut = this.shortcuts.get(shortcutId);
    if (!shortcut) {
      return false;
    }

    shortcut.enabled = false;

    // 触发事件
    this.eventEmitter.emit({
      type: 'shortcut.disabled',
      shortcutId,
      shortcut,
      timestamp: Date.now()
    });

    return true;
  }

  /**
   * 清空所有快捷键
   */
  clear(): void {
    this.shortcuts.clear();
    this.keyMapping.clear();
    this.commandMapping.clear();
    this.categoryMapping.clear();
  }

  /**
   * 获取事件发射器
   */
  getEventEmitter(): IShortcutEventEmitter {
    return this.eventEmitter;
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const categories = new Set<string>();
    const commands = new Set<string>();
    let enabledCount = 0;

    this.shortcuts.forEach(shortcut => {
      if (shortcut.category) {
        categories.add(shortcut.category);
      }
      commands.add(shortcut.commandName);
      if (shortcut.enabled) {
        enabledCount++;
      }
    });

    return {
      totalShortcuts: this.shortcuts.size,
      enabledShortcuts: enabledCount,
      disabledShortcuts: this.shortcuts.size - enabledCount,
      totalCategories: categories.size,
      totalCommands: commands.size,
      keyMappings: this.keyMapping.size
    };
  }
}

/**
 * 创建快捷键注册表实例
 */
export const createShortcutRegistry = (): ShortcutRegistry => {
  return new ShortcutRegistry();
};

// CommonJS导出
module.exports = {
  ShortcutRegistry,
  createShortcutRegistry
}; 