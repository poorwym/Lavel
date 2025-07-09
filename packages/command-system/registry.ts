/**
 * 命令注册表实现
 */

import { 
  ICommand, 
  ICommandRegistry, 
  ICommandEvent, 
  ICommandEventEmitter, 
  CommandEventListener, 
  CommandEventType 
} from './types';

/**
 * 简单的事件发射器实现
 */
class CommandEventEmitter implements ICommandEventEmitter {
  private listeners: Map<CommandEventType, CommandEventListener[]> = new Map();

  on(eventType: CommandEventType, listener: CommandEventListener): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)?.push(listener);
  }

  off(eventType: CommandEventType, listener: CommandEventListener): void {
    const eventListeners = this.listeners.get(eventType);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  emit(event: ICommandEvent): void {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach(listener => {
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
 * 命令注册表实现
 */
export class CommandRegistry implements ICommandRegistry {
  private commands: Map<string, ICommand> = new Map();
  private aliases: Map<string, string> = new Map();
  private eventEmitter = new CommandEventEmitter();

  /**
   * 注册命令
   */
  register(command: ICommand): void {
    // 验证命令定义
    this.validateCommand(command);

    // 检查命令名是否已存在
    if (this.commands.has(command.name)) {
      throw new Error(`命令 '${command.name}' 已存在`);
    }

    // 检查别名是否冲突
    if (command.aliases) {
      for (const alias of command.aliases) {
        if (this.commands.has(alias) || this.aliases.has(alias)) {
          throw new Error(`别名 '${alias}' 已被使用`);
        }
      }
    }

    // 注册命令
    this.commands.set(command.name, command);

    // 注册别名
    if (command.aliases) {
      for (const alias of command.aliases) {
        this.aliases.set(alias, command.name);
      }
    }

    // 触发注册事件
    this.eventEmitter.emit({
      type: 'command.registered',
      commandName: command.name,
      timestamp: Date.now(),
      data: { command }
    });
  }

  /**
   * 注销命令
   */
  unregister(commandName: string): boolean {
    const command = this.commands.get(commandName);
    if (!command) {
      return false;
    }

    // 移除命令
    this.commands.delete(commandName);

    // 移除别名
    if (command.aliases) {
      for (const alias of command.aliases) {
        this.aliases.delete(alias);
      }
    }

    // 触发注销事件
    this.eventEmitter.emit({
      type: 'command.unregistered',
      commandName: commandName,
      timestamp: Date.now(),
      data: { command }
    });

    return true;
  }

  /**
   * 获取命令
   */
  get(commandName: string): ICommand | undefined {
    // 直接查找命令名
    let command = this.commands.get(commandName);
    if (command) {
      return command;
    }

    // 通过别名查找
    const actualName = this.aliases.get(commandName);
    if (actualName) {
      return this.commands.get(actualName);
    }

    return undefined;
  }

  /**
   * 获取所有命令
   */
  getAll(): ICommand[] {
    return Array.from(this.commands.values());
  }

  /**
   * 根据分类获取命令
   */
  getByCategory(category: string): ICommand[] {
    return Array.from(this.commands.values()).filter(
      command => command.category === category
    );
  }

  /**
   * 检查命令是否存在
   */
  has(commandName: string): boolean {
    return this.commands.has(commandName) || this.aliases.has(commandName);
  }

  /**
   * 清空所有命令
   */
  clear(): void {
    this.commands.clear();
    this.aliases.clear();
  }

  /**
   * 获取事件发射器
   */
  getEventEmitter(): ICommandEventEmitter {
    return this.eventEmitter;
  }

  /**
   * 获取命令统计信息
   */
  getStats(): {
    totalCommands: number;
    totalAliases: number;
    categories: string[];
    commandsByCategory: Record<string, number>;
  } {
    const categories = [...new Set(
      Array.from(this.commands.values())
        .map(cmd => cmd.category)
        .filter(Boolean)
    )] as string[];

    const commandsByCategory: Record<string, number> = {};
    categories.forEach(category => {
      commandsByCategory[category] = this.getByCategory(category).length;
    });

    return {
      totalCommands: this.commands.size,
      totalAliases: this.aliases.size,
      categories,
      commandsByCategory
    };
  }

  /**
   * 验证命令定义
   */
  private validateCommand(command: ICommand): void {
    if (!command.name || typeof command.name !== 'string') {
      throw new Error('命令名称必须是非空字符串');
    }

    if (!command.description || typeof command.description !== 'string') {
      throw new Error('命令描述必须是非空字符串');
    }

    if (!command.execute || typeof command.execute !== 'function') {
      throw new Error('命令必须提供执行函数');
    }

    // 验证参数定义
    if (command.parameters) {
      for (const param of command.parameters) {
        if (!param.name || typeof param.name !== 'string') {
          throw new Error(`参数名称必须是非空字符串`);
        }
        if (!['string', 'number', 'boolean', 'array', 'object'].includes(param.type)) {
          throw new Error(`参数 '${param.name}' 的类型无效`);
        }
      }
    }

    // 验证别名
    if (command.aliases) {
      if (!Array.isArray(command.aliases)) {
        throw new Error('别名必须是字符串数组');
      }
      for (const alias of command.aliases) {
        if (!alias || typeof alias !== 'string') {
          throw new Error('别名必须是非空字符串');
        }
      }
    }
  }
}

/**
 * 创建默认的命令注册表实例
 */
export const createCommandRegistry = (): CommandRegistry => {
  return new CommandRegistry();
}; 