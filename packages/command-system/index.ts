/**
 * 命令系统入口模块
 * 
 * 提供完整的命令系统功能，包括命令注册、执行、中间件管理等。
 * 这是命令系统的主要入口点，提供了高级API和便捷方法。
 * 
 * @author Lavel Team
 * @since 1.0.0
 * 
 * @example
 * ```typescript
 * import { CommandSystem, createCommandSystem } from './command-system';
 * 
 * // 创建命令系统实例
 * const commandSystem = createCommandSystem({
 *   debug: true,
 *   timeout: 5000
 * });
 * 
 * // 注册命令
 * commandSystem.register({
 *   name: 'hello',
 *   description: 'Say hello',
 *   execute: async (context) => ({
 *     success: true,
 *     data: { message: `Hello, ${context.args.name}!` }
 *   })
 * });
 * 
 * // 执行命令
 * const result = await commandSystem.execute('hello', {
 *   args: { name: 'World' },
 *   env: {}
 * });
 * ```
 */

// 导出所有类型定义
export * from './types';

// 导出核心类
export { CommandRegistry, createCommandRegistry } from './registry';
export { CommandDispatcher, createCommandDispatcher } from './dispatcher';

// 导入依赖
import { CommandRegistry, createCommandRegistry } from './registry';
import { CommandDispatcher, createCommandDispatcher } from './dispatcher';
import { 
  ICommandSystemConfig, 
  ICommand, 
  ICommandContext, 
  ICommandResult,
  ICommandMiddleware,
  ICommandEventEmitter 
} from './types';

/**
 * 命令系统主类
 * 
 * 提供完整的命令系统功能，包括命令管理、执行调度、中间件支持等。
 * 这是命令系统的核心类，整合了注册表和调度器的功能。
 * 
 * @public
 * @since 1.0.0
 * 
 * @example
 * ```typescript
 * const commandSystem = new CommandSystem({
 *   debug: true,
 *   enableAuth: true,
 *   timeout: 10000
 * });
 * 
 * // 注册命令
 * commandSystem.register(myCommand);
 * 
 * // 执行命令
 * const result = await commandSystem.execute('myCommand', context);
 * ```
 */
export class CommandSystem {
  /** @internal 命令注册表实例 */
  private registry: CommandRegistry;
  
  /** @internal 命令调度器实例 */
  private dispatcher: CommandDispatcher;
  
  /** @internal 事件发射器实例 */
  private eventEmitter: ICommandEventEmitter;

  /**
   * 创建命令系统实例
   * 
   * @param config - 命令系统配置选项
   * 
   * @example
   * ```typescript
   * const system = new CommandSystem({
   *   debug: true,
   *   timeout: 5000,
   *   enableAuth: true,
   *   errorHandler: (error, context) => {
   *     console.error('Command failed:', error.message);
   *   }
   * });
   * ```
   */
  constructor(config: ICommandSystemConfig = {}) {
    this.registry = createCommandRegistry();
    this.eventEmitter = this.registry.getEventEmitter();
    this.dispatcher = createCommandDispatcher(this.registry, config, this.eventEmitter);
  }

  /**
   * 注册命令
   * 
   * 将一个命令添加到系统中，使其可以被调用。
   * 
   * @param command - 要注册的命令定义
   * @throws {Error} 当命令名称已存在或命令定义无效时抛出错误
   * 
   * @example
   * ```typescript
   * commandSystem.register({
   *   name: 'greet',
   *   description: '问候用户',
   *   parameters: [
   *     { name: 'name', type: 'string', required: true, description: '用户名' }
   *   ],
   *   execute: async (context) => ({
   *     success: true,
   *     data: { greeting: `Hello, ${context.args.name}!` }
   *   })
   * });
   * ```
   */
  register(command: ICommand): void {
    this.registry.register(command);
  }

  /**
   * 注册多个命令
   * 
   * 批量注册命令，提供便捷的批量操作方法。
   * 
   * @param commands - 要注册的命令列表
   * @throws {Error} 当任何命令注册失败时抛出错误
   * 
   * @example
   * ```typescript
   * commandSystem.registerCommands([
   *   addCommand,
   *   subtractCommand,
   *   multiplyCommand
   * ]);
   * ```
   */
  registerCommands(commands: ICommand[]): void {
    commands.forEach(command => this.register(command));
  }

  /**
   * 注销命令
   * 
   * 从系统中移除指定的命令，使其不再可用。
   * 
   * @param commandName - 要注销的命令名称
   * @returns 是否成功注销命令（false表示命令不存在）
   * 
   * @example
   * ```typescript
   * const success = commandSystem.unregister('greet');
   * if (success) {
   *   console.log('命令已成功注销');
   * } else {
   *   console.log('命令不存在');
   * }
   * ```
   */
  unregister(commandName: string): boolean {
    return this.registry.unregister(commandName);
  }

  /**
   * 执行命令
   * 
   * 根据命令名称执行指定命令，包括完整的验证、权限检查和中间件处理流程。
   * 
   * @param commandName - 要执行的命令名称或别名
   * @param context - 命令执行上下文，包含参数、环境和用户信息
   * @returns 命令执行结果的Promise
   * 
   * @example
   * ```typescript
   * const result = await commandSystem.execute('greet', {
   *   args: { name: 'Alice' },
   *   env: { locale: 'zh-CN' },
   *   user: { id: 'user123', permissions: ['basic'] }
   * });
   * 
   * if (result.success) {
   *   console.log('执行成功:', result.data);
   * } else {
   *   console.error('执行失败:', result.error);
   * }
   * ```
   */
  async execute(commandName: string, context: ICommandContext): Promise<ICommandResult> {
    return this.dispatcher.execute(commandName, context);
  }

  /**
   * 批量执行命令
   * 
   * 按顺序执行多个命令，前一个命令完成后再执行下一个。
   * 适用于需要保证执行顺序的场景。
   * 
   * @param commands - 要执行的命令列表，包含命令名和上下文
   * @returns 所有命令执行结果的Promise数组
   * 
   * @example
   * ```typescript
   * const results = await commandSystem.executeBatch([
   *   { name: 'validate', context: validationContext },
   *   { name: 'process', context: processContext },
   *   { name: 'cleanup', context: cleanupContext }
   * ]);
   * 
   * results.forEach((result, index) => {
   *   console.log(`命令 ${index + 1} 结果:`, result.success);
   * });
   * ```
   */
  async executeBatch(commands: Array<{ name: string; context: ICommandContext }>): Promise<ICommandResult[]> {
    return this.dispatcher.executeBatch(commands);
  }

  /**
   * 并行批量执行命令
   * 
   * 并行执行多个命令，所有命令同时开始执行。
   * 适用于命令之间无依赖关系的场景，可以提高执行效率。
   * 
   * @param commands - 要执行的命令列表
   * @returns 所有命令执行结果的Promise数组
   * 
   * @example
   * ```typescript
   * const results = await commandSystem.executeBatchParallel([
   *   { name: 'fetchUserData', context: userContext },
   *   { name: 'fetchSettings', context: settingsContext },
   *   { name: 'fetchNotifications', context: notificationsContext }
   * ]);
   * 
   * // 所有数据并行获取完成
   * const [userData, settings, notifications] = results;
   * ```
   */
  async executeBatchParallel(commands: Array<{ name: string; context: ICommandContext }>): Promise<ICommandResult[]> {
    return this.dispatcher.executeBatchParallel(commands);
  }

  /**
   * 获取命令
   * 
   * 根据命令名称或别名获取命令定义。
   * 
   * @param commandName - 命令名称或别名
   * @returns 命令定义对象，如果不存在则返回undefined
   * 
   * @example
   * ```typescript
   * const command = commandSystem.getCommand('greet');
   * if (command) {
   *   console.log('命令描述:', command.description);
   *   console.log('参数列表:', command.parameters);
   * }
   * ```
   */
  getCommand(commandName: string): ICommand | undefined {
    return this.registry.get(commandName);
  }

  /**
   * 获取所有命令
   * 
   * 返回系统中所有已注册的命令列表。
   * 
   * @returns 所有命令的数组
   * 
   * @example
   * ```typescript
   * const allCommands = commandSystem.getAllCommands();
   * console.log(`系统中共有 ${allCommands.length} 个命令`);
   * 
   * allCommands.forEach(command => {
   *   console.log(`- ${command.name}: ${command.description}`);
   * });
   * ```
   */
  getAllCommands(): ICommand[] {
    return this.registry.getAll();
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
   * const mathCommands = commandSystem.getCommandsByCategory('math');
   * const userCommands = commandSystem.getCommandsByCategory('user');
   * 
   * console.log('数学命令:', mathCommands.map(cmd => cmd.name));
   * console.log('用户命令:', userCommands.map(cmd => cmd.name));
   * ```
   */
  getCommandsByCategory(category: string): ICommand[] {
    return this.registry.getByCategory(category);
  }

  /**
   * 检查命令是否存在
   * 
   * 检查指定名称的命令是否已在系统中注册。
   * 
   * @param commandName - 命令名称或别名
   * @returns 命令是否存在
   * 
   * @example
   * ```typescript
   * if (commandSystem.hasCommand('greet')) {
   *   console.log('greet 命令可用');
   * } else {
   *   console.log('greet 命令未注册');
   * }
   * ```
   */
  hasCommand(commandName: string): boolean {
    return this.registry.has(commandName);
  }

  /**
   * 设置全局中间件
   * 
   * 添加应用于所有命令的中间件。中间件按照order属性排序执行。
   * 
   * @param middleware - 要添加的中间件定义
   * 
   * @example
   * ```typescript
   * commandSystem.use({
   *   name: 'performance-monitor',
   *   order: -100,
   *   before: (context) => {
   *     context.env.startTime = Date.now();
   *     return context;
   *   },
   *   after: (context, result) => {
   *     const duration = Date.now() - context.env.startTime;
   *     if (duration > 1000) {
   *       console.warn(`慢命令警告: ${context.args} 耗时 ${duration}ms`);
   *     }
   *     return result;
   *   }
   * });
   * ```
   */
  use(middleware: ICommandMiddleware): void {
    this.dispatcher.use(middleware);
  }

  /**
   * 移除全局中间件
   * 
   * 根据名称移除已注册的全局中间件。
   * 
   * @param middlewareName - 要移除的中间件名称
   * @returns 是否成功移除中间件
   * 
   * @example
   * ```typescript
   * const removed = commandSystem.removeMiddleware('performance-monitor');
   * if (removed) {
   *   console.log('中间件已移除');
   * } else {
   *   console.log('中间件不存在');
   * }
   * ```
   */
  removeMiddleware(middlewareName: string): boolean {
    return this.dispatcher.removeMiddleware(middlewareName);
  }

  /**
   * 获取注册表统计信息
   * 
   * 返回命令系统的统计信息，包括命令数量、分类等。
   * 
   * @returns 包含统计信息的对象
   * 
   * @example
   * ```typescript
   * const stats = commandSystem.getStats();
   * console.log(`总命令数: ${stats.totalCommands}`);
   * console.log(`总别名数: ${stats.totalAliases}`);
   * console.log(`分类列表:`, stats.categories);
   * console.log(`各分类命令数:`, stats.commandsByCategory);
   * ```
   */
  getStats() {
    return this.registry.getStats();
  }

  /**
   * 获取事件发射器
   * 
   * 返回事件发射器实例，可用于监听命令系统事件。
   * 
   * @returns 事件发射器实例
   * 
   * @example
   * ```typescript
   * const eventEmitter = commandSystem.getEventEmitter();
   * 
   * eventEmitter.on('command.executed', (event) => {
   *   console.log(`命令 ${event.commandName} 执行完成`);
   * });
   * 
   * eventEmitter.on('command.error', (event) => {
   *   console.error(`命令 ${event.commandName} 执行失败:`, event.error);
   * });
   * ```
   */
  getEventEmitter(): ICommandEventEmitter {
    return this.eventEmitter;
  }

  /**
   * 清空所有命令
   * 
   * 移除系统中的所有已注册命令。通常用于测试或重置系统状态。
   * 
   * @example
   * ```typescript
   * commandSystem.clear();
   * console.log('所有命令已清空');
   * ```
   */
  clear(): void {
    this.registry.clear();
  }
}

/**
 * 创建命令系统实例
 * 
 * 工厂函数，用于创建和配置命令系统实例。
 * 
 * @param config - 可选的系统配置参数
 * @returns 新的命令系统实例
 * 
 * @example
 * ```typescript
 * const commandSystem = createCommandSystem({
 *   debug: process.env.NODE_ENV === 'development',
 *   timeout: 30000,
 *   enableAuth: true,
 *   enableLogging: true
 * });
 * ```
 */
export const createCommandSystem = (config?: ICommandSystemConfig): CommandSystem => {
  return new CommandSystem(config);
};

/**
 * 默认的命令系统实例
 * 
 * 提供一个全局共享的命令系统实例，便于在应用中快速使用。
 * 使用默认配置创建，适合简单场景或快速原型开发。
 * 
 * @example
 * ```typescript
 * import { defaultCommandSystem } from './command-system';
 * 
 * // 直接使用默认实例
 * defaultCommandSystem.register(myCommand);
 * const result = await defaultCommandSystem.execute('myCommand', context);
 * ```
 */
export const defaultCommandSystem = createCommandSystem();

/**
 * 便捷方法 - 注册命令到默认系统
 * 
 * 将命令注册到默认的命令系统实例中。
 * 
 * @param command - 要注册的命令定义
 * 
 * @example
 * ```typescript
 * import { registerCommand } from './command-system';
 * 
 * registerCommand({
 *   name: 'hello',
 *   description: 'Say hello',
 *   execute: () => ({ success: true, data: 'Hello!' })
 * });
 * ```
 */
export const registerCommand = (command: ICommand): void => {
  defaultCommandSystem.register(command);
};

/**
 * 便捷方法 - 执行命令
 * 
 * 在默认命令系统实例中执行指定命令。
 * 
 * @param commandName - 要执行的命令名称
 * @param context - 命令执行上下文
 * @returns 命令执行结果的Promise
 * 
 * @example
 * ```typescript
 * import { executeCommand } from './command-system';
 * 
 * const result = await executeCommand('hello', {
 *   args: { name: 'World' },
 *   env: {}
 * });
 * ```
 */
export const executeCommand = (commandName: string, context: ICommandContext): Promise<ICommandResult> => {
  return defaultCommandSystem.execute(commandName, context);
};

/**
 * 便捷方法 - 使用中间件
 * 
 * 向默认命令系统实例添加全局中间件。
 * 
 * @param middleware - 要添加的中间件定义
 * 
 * @example
 * ```typescript
 * import { useMiddleware } from './command-system';
 * 
 * useMiddleware({
 *   name: 'logger',
 *   before: (context) => {
 *     console.log('执行命令:', context.args);
 *     return context;
 *   }
 * });
 * ```
 */
export const useMiddleware = (middleware: ICommandMiddleware): void => {
  defaultCommandSystem.use(middleware);
};

/**
 * 内置中间件集合
 * 
 * 提供一系列预定义的常用中间件，可直接使用或作为参考。
 * 
 * @public
 * @since 1.0.0
 */
export const builtinMiddleware = {
  /**
   * 日志中间件
   * 
   * 记录命令执行的日志信息，支持多种日志级别和输出选项。
   * 
   * @param options - 日志中间件配置选项
   * @param options.enableConsole - 是否启用控制台输出
   * @param options.logLevel - 日志级别
   * @returns 配置好的日志中间件
   * 
   * @example
   * ```typescript
   * commandSystem.use(builtinMiddleware.logger({
   *   enableConsole: true,
   *   logLevel: 'info'
   * }));
   * ```
   */
  logger: (options: { enableConsole?: boolean; logLevel?: 'info' | 'debug' | 'warn' | 'error' } = {}): ICommandMiddleware => ({
    name: 'logger',
    order: -1000,
    before: (context) => {
      if (options.enableConsole) {
        console.log(`[命令执行] 开始执行命令`, { 
          args: context.args, 
          user: context.user?.id 
        });
      }
      return context;
    },
    after: (_context, result) => {
      if (options.enableConsole) {
        console.log(`[命令执行] 命令执行完成`, { 
          success: result.success, 
          executionTime: result.executionTime 
        });
      }
      return result;
    },
    onError: (_context, error) => {
      if (options.enableConsole) {
        console.error(`[命令执行] 命令执行失败:`, error.message);
      }
      return { success: false, error: error.message };
    }
  }),

  /**
   * 性能监控中间件
   * 
   * 监控命令执行性能，当执行时间超过阈值时发出警告。
   * 
   * @param options - 性能监控配置选项
   * @param options.slowThreshold - 慢命令阈值（毫秒）
   * @returns 配置好的性能监控中间件
   * 
   * @example
   * ```typescript
   * commandSystem.use(builtinMiddleware.performance({
   *   slowThreshold: 2000 // 超过2秒发出警告
   * }));
   * ```
   */
  performance: (options: { slowThreshold?: number } = {}): ICommandMiddleware => {
    const threshold = options.slowThreshold || 1000;
    
    return {
      name: 'performance',
      order: -900,
      after: (_context, result) => {
        if (result.executionTime && result.executionTime > threshold) {
          console.warn(`[性能警告] 命令执行时间过长: ${result.executionTime}ms`);
        }
        return result;
      }
    };
  },

  /**
   * 限流中间件
   * 
   * 对命令执行进行限流控制，防止过于频繁的调用。
   * 
   * @param options - 限流配置选项
   * @param options.maxRequests - 时间窗口内最大请求数
   * @param options.windowMs - 时间窗口大小（毫秒）
   * @returns 配置好的限流中间件
   * 
   * @example
   * ```typescript
   * commandSystem.use(builtinMiddleware.rateLimit({
   *   maxRequests: 100,
   *   windowMs: 60000 // 每分钟最多100次请求
   * }));
   * ```
   */
  rateLimit: (options: { maxRequests: number; windowMs: number }): ICommandMiddleware => {
    const requests = new Map<string, number[]>();
    
    return {
      name: 'rateLimit',
      order: -800,
      before: (context) => {
        const userId = context.user?.id || 'anonymous';
        const now = Date.now();
        
        if (!requests.has(userId)) {
          requests.set(userId, []);
        }
        
        const userRequests = requests.get(userId)!;
        // 清理过期的请求记录
        const validRequests = userRequests.filter(time => now - time < options.windowMs);
        requests.set(userId, validRequests);
        
        if (validRequests.length >= options.maxRequests) {
          throw new Error(`请求过于频繁，请稍后再试`);
        }
        
        validRequests.push(now);
        return context;
      }
    };
  },

  /**
   * 权限检查中间件
   * 
   * 提供额外的权限检查逻辑，可以实现复杂的权限控制。
   * 
   * @param options - 权限检查配置选项
   * @param options.requiredPermissions - 必需的权限列表
   * @param options.requireAll - 是否需要所有权限（默认只需任一权限）
   * @returns 配置好的权限检查中间件
   * 
   * @example
   * ```typescript
   * commandSystem.use(builtinMiddleware.authCheck({
   *   requiredPermissions: ['admin', 'moderator'],
   *   requireAll: false // 只需要其中一个权限
   * }));
   * ```
   */
  authCheck: (options: { requiredPermissions: string[]; requireAll?: boolean }): ICommandMiddleware => ({
    name: 'authCheck',
    order: -700,
    before: (context) => {
      if (!context.user) {
        throw new Error('需要用户认证');
      }
      
      const userPermissions = context.user.permissions;
      const hasPermission = options.requireAll
        ? options.requiredPermissions.every(p => userPermissions.includes(p))
        : options.requiredPermissions.some(p => userPermissions.includes(p));
      
      if (!hasPermission) {
        throw new Error(`权限不足，需要权限: ${options.requiredPermissions.join(', ')}`);
      }
      
      return context;
    }
  })
}; 