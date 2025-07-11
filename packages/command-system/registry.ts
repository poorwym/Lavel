/**
 * 命令注册表实现
 * 
 * 提供命令的注册、管理和查询功能，以及事件发射机制。
 * 注册表是命令系统的核心组件，负责维护所有可用命令的索引。
 * 
 * @author Lavel Team
 * @since 1.0.0
 * 
 * @example
 * ```typescript
 * const registry = createCommandRegistry();
 * 
 * // 注册命令
 * registry.register(myCommand);
 * 
 * // 查询命令
 * const command = registry.get('myCommand');
 * 
 * // 监听事件
 * registry.getEventEmitter().on('command.registered', (event) => {
 *   console.log('新命令已注册:', event.commandName);
 * });
 * ```
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
 * 
 * 提供事件监听器的注册、移除和事件发射功能。
 * 实现了命令系统的事件通知机制。
 * 
 * @internal
 * @since 1.0.0
 * 
 * @example
 * ```typescript
 * const emitter = new CommandEventEmitter();
 * 
 * // 添加监听器
 * emitter.on('command.executed', (event) => {
 *   console.log('命令执行完成:', event.commandName);
 * });
 * 
 * // 发射事件
 * emitter.emit({
 *   type: 'command.executed',
 *   commandName: 'test',
 *   timestamp: Date.now()
 * });
 * ```
 */
class CommandEventEmitter implements ICommandEventEmitter {
  /** @internal 事件监听器映射表 */
  private listeners: Map<CommandEventType, CommandEventListener[]> = new Map();

  /**
   * 添加事件监听器
   * 
   * 为指定事件类型注册一个监听器函数。
   * 
   * @param eventType - 要监听的事件类型
   * @param listener - 事件处理函数
   * 
   * @example
   * ```typescript
   * emitter.on('command.registered', (event) => {
   *   console.log(`命令 ${event.commandName} 已注册`);
   * });
   * ```
   */
  on(eventType: CommandEventType, listener: CommandEventListener): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)?.push(listener);
  }

  /**
   * 移除事件监听器
   * 
   * 取消注册指定的事件监听器。
   * 
   * @param eventType - 事件类型
   * @param listener - 要移除的监听器函数
   * 
   * @example
   * ```typescript
   * const listener = (event) => console.log(event);
   * emitter.on('command.executed', listener);
   * emitter.off('command.executed', listener); // 移除监听器
   * ```
   */
  off(eventType: CommandEventType, listener: CommandEventListener): void {
    const eventListeners = this.listeners.get(eventType);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  /**
   * 发射事件
   * 
   * 向所有相关的监听器发送事件通知。
   * 如果监听器执行出错，会捕获错误并继续执行其他监听器。
   * 
   * @param event - 要发射的事件对象
   * 
   * @example
   * ```typescript
   * emitter.emit({
   *   type: 'command.error',
   *   commandName: 'failedCommand',
   *   timestamp: Date.now(),
   *   error: new Error('执行失败')
   * });
   * ```
   */
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
 * 命令注册表实现类
 * 
 * 管理命令的生命周期，包括注册、注销、查询和统计。
 * 提供命令别名支持和事件通知机制。
 * 
 * @public
 * @since 1.0.0
 * 
 * @example
 * ```typescript
 * const registry = new CommandRegistry();
 * 
 * // 注册命令
 * registry.register({
 *   name: 'hello',
 *   description: 'Say hello',
 *   aliases: ['hi', 'greet'],
 *   execute: () => ({ success: true, data: 'Hello!' })
 * });
 * 
 * // 通过别名查询
 * const command = registry.get('hi'); // 返回hello命令
 * 
 * // 获取统计信息
 * const stats = registry.getStats();
 * console.log(`总命令数: ${stats.totalCommands}`);
 * ```
 */
export class CommandRegistry implements ICommandRegistry {
  /** @internal 命令存储映射表，键为命令名，值为命令定义 */
  private commands: Map<string, ICommand> = new Map();
  
  /** @internal 别名映射表，键为别名，值为实际命令名 */
  private aliases: Map<string, string> = new Map();
  
  /** @internal 事件发射器实例 */
  private eventEmitter = new CommandEventEmitter();

  /**
   * 注册命令
   * 
   * 将命令添加到注册表中，包括命令名和别名的索引。
   * 会触发'command.registered'事件。
   * 
   * @param command - 要注册的命令定义
   * @throws {Error} 当命令名称已存在、别名冲突或命令定义无效时抛出错误
   * 
   * @example
   * ```typescript
   * registry.register({
   *   name: 'add',
   *   description: '执行加法运算',
   *   aliases: ['plus', '+'],
   *   parameters: [
   *     { name: 'a', type: 'number', required: true },
   *     { name: 'b', type: 'number', required: true }
   *   ],
   *   execute: async (context) => ({
   *     success: true,
   *     data: { result: context.args.a + context.args.b }
   *   })
   * });
   * ```
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
   * 
   * 从注册表中移除指定命令，包括其所有别名。
   * 会触发'command.unregistered'事件。
   * 
   * @param commandName - 要注销的命令名称
   * @returns 是否成功注销命令（false表示命令不存在）
   * 
   * @example
   * ```typescript
   * const success = registry.unregister('add');
   * if (success) {
   *   console.log('命令已成功注销');
   * } else {
   *   console.log('命令不存在');
   * }
   * ```
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
   * 
   * 根据命令名或别名查找并返回命令定义。
   * 
   * @param commandName - 命令名称或别名
   * @returns 命令定义对象，如果不存在则返回undefined
   * 
   * @example
   * ```typescript
   * // 通过命令名查找
   * const command = registry.get('add');
   * 
   * // 通过别名查找
   * const sameCommand = registry.get('+'); // 返回同一个add命令
   * 
   * if (command) {
   *   console.log('命令描述:', command.description);
   * }
   * ```
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
   * 
   * 返回注册表中所有已注册的命令列表。
   * 
   * @returns 所有命令的数组
   * 
   * @example
   * ```typescript
   * const allCommands = registry.getAll();
   * console.log(`共有 ${allCommands.length} 个命令`);
   * 
   * allCommands.forEach(command => {
   *   console.log(`- ${command.name}: ${command.description}`);
   * });
   * ```
   */
  getAll(): ICommand[] {
    return Array.from(this.commands.values());
  }

  /**
   * 根据分类获取命令
   * 
   * 获取指定分类下的所有命令。
   * 
   * @param category - 命令分类名称
   * @returns 该分类下的命令数组
   * 
   * @example
   * ```typescript
   * const mathCommands = registry.getByCategory('math');
   * const userCommands = registry.getByCategory('user');
   * 
   * console.log('数学命令:', mathCommands.map(cmd => cmd.name));
   * console.log('用户命令:', userCommands.map(cmd => cmd.name));
   * ```
   */
  getByCategory(category: string): ICommand[] {
    return Array.from(this.commands.values()).filter(
      command => command.category === category
    );
  }

  /**
   * 检查命令是否存在
   * 
   * 检查指定名称的命令或别名是否已在注册表中。
   * 
   * @param commandName - 命令名称或别名
   * @returns 命令是否存在
   * 
   * @example
   * ```typescript
   * if (registry.has('add')) {
   *   console.log('add 命令存在');
   * }
   * 
   * if (registry.has('+')) {
   *   console.log('+ 别名存在');
   * }
   * ```
   */
  has(commandName: string): boolean {
    return this.commands.has(commandName) || this.aliases.has(commandName);
  }

  /**
   * 清空所有命令
   * 
   * 移除注册表中的所有命令和别名。
   * 通常用于测试或重置系统状态。
   * 
   * @example
   * ```typescript
   * registry.clear();
   * console.log('所有命令已清空');
   * console.log('命令数量:', registry.getAll().length); // 输出: 0
   * ```
   */
  clear(): void {
    this.commands.clear();
    this.aliases.clear();
  }

  /**
   * 获取事件发射器
   * 
   * 返回与此注册表关联的事件发射器实例，
   * 可用于监听命令注册/注销等事件。
   * 
   * @returns 事件发射器实例
   * 
   * @example
   * ```typescript
   * const eventEmitter = registry.getEventEmitter();
   * 
   * eventEmitter.on('command.registered', (event) => {
   *   console.log(`新命令已注册: ${event.commandName}`);
   * });
   * 
   * eventEmitter.on('command.unregistered', (event) => {
   *   console.log(`命令已注销: ${event.commandName}`);
   * });
   * ```
   */
  getEventEmitter(): ICommandEventEmitter {
    return this.eventEmitter;
  }

  /**
   * 获取命令统计信息
   * 
   * 返回注册表的详细统计信息，包括命令数量、别名数量、
   * 分类信息和各分类下的命令分布。
   * 
   * @returns 包含统计信息的对象
   * 
   * @example
   * ```typescript
   * const stats = registry.getStats();
   * 
   * console.log(`总命令数: ${stats.totalCommands}`);
   * console.log(`总别名数: ${stats.totalAliases}`);
   * console.log(`分类列表:`, stats.categories);
   * 
   * Object.entries(stats.commandsByCategory).forEach(([category, count]) => {
   *   console.log(`${category} 分类: ${count} 个命令`);
   * });
   * ```
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
   * 
   * 检查命令定义是否符合规范，包括必需字段、数据类型和格式验证。
   * 
   * @param command - 要验证的命令定义
   * @throws {Error} 当命令定义无效时抛出相应的错误信息
   * 
   * @private
   * 
   * @example
   * ```typescript
   * // 内部验证逻辑示例
   * try {
   *   this.validateCommand(command);
   *   console.log('命令定义有效');
   * } catch (error) {
   *   console.error('命令定义错误:', error.message);
   * }
   * ```
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
        if (alias === command.name) {
          throw new Error('别名不能与命令名相同');
        }
      }
    }

    // 验证权限列表
    if (command.permissions) {
      if (!Array.isArray(command.permissions)) {
        throw new Error('权限列表必须是字符串数组');
      }
      for (const permission of command.permissions) {
        if (!permission || typeof permission !== 'string') {
          throw new Error('权限必须是非空字符串');
        }
      }
    }
  }
}

/**
 * 创建命令注册表实例
 * 
 * 工厂函数，用于创建新的命令注册表实例。
 * 
 * @returns 新的命令注册表实例
 * 
 * @example
 * ```typescript
 * const registry = createCommandRegistry();
 * 
 * // 注册命令
 * registry.register(myCommand);
 * 
 * // 查询命令
 * const command = registry.get('myCommand');
 * ```
 */
export const createCommandRegistry = (): CommandRegistry => {
  return new CommandRegistry();
}; 