/**
 * 命令系统入口模块
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
 */
export class CommandSystem {
  private registry: CommandRegistry;
  private dispatcher: CommandDispatcher;
  private eventEmitter: ICommandEventEmitter;

  constructor(config: ICommandSystemConfig = {}) {
    this.registry = createCommandRegistry();
    this.eventEmitter = this.registry.getEventEmitter();
    this.dispatcher = createCommandDispatcher(this.registry, config, this.eventEmitter);
  }

  /**
   * 注册命令
   */
  register(command: ICommand): void {
    this.registry.register(command);
  }

  /**
   * 注册多个命令
   */
  registerCommands(commands: ICommand[]): void {
    commands.forEach(command => this.register(command));
  }

  /**
   * 注销命令
   */
  unregister(commandName: string): boolean {
    return this.registry.unregister(commandName);
  }

  /**
   * 执行命令
   */
  async execute(commandName: string, context: ICommandContext): Promise<ICommandResult> {
    return this.dispatcher.execute(commandName, context);
  }

  /**
   * 批量执行命令
   */
  async executeBatch(commands: Array<{ name: string; context: ICommandContext }>): Promise<ICommandResult[]> {
    return this.dispatcher.executeBatch(commands);
  }

  /**
   * 并行批量执行命令
   */
  async executeBatchParallel(commands: Array<{ name: string; context: ICommandContext }>): Promise<ICommandResult[]> {
    return this.dispatcher.executeBatchParallel(commands);
  }

  /**
   * 获取命令
   */
  getCommand(commandName: string): ICommand | undefined {
    return this.registry.get(commandName);
  }

  /**
   * 获取所有命令
   */
  getAllCommands(): ICommand[] {
    return this.registry.getAll();
  }

  /**
   * 根据分类获取命令
   */
  getCommandsByCategory(category: string): ICommand[] {
    return this.registry.getByCategory(category);
  }

  /**
   * 检查命令是否存在
   */
  hasCommand(commandName: string): boolean {
    return this.registry.has(commandName);
  }

  /**
   * 设置全局中间件
   */
  use(middleware: ICommandMiddleware): void {
    this.dispatcher.use(middleware);
  }

  /**
   * 移除全局中间件
   */
  removeMiddleware(middlewareName: string): boolean {
    return this.dispatcher.removeMiddleware(middlewareName);
  }

  /**
   * 获取注册表统计信息
   */
  getStats() {
    return this.registry.getStats();
  }

  /**
   * 获取事件发射器
   */
  getEventEmitter(): ICommandEventEmitter {
    return this.eventEmitter;
  }

  /**
   * 清空所有命令
   */
  clear(): void {
    this.registry.clear();
  }
}

/**
 * 创建命令系统实例
 */
export const createCommandSystem = (config?: ICommandSystemConfig): CommandSystem => {
  return new CommandSystem(config);
};

/**
 * 默认的命令系统实例
 */
export const defaultCommandSystem = createCommandSystem();

/**
 * 便捷方法 - 注册命令到默认系统
 */
export const registerCommand = (command: ICommand): void => {
  defaultCommandSystem.register(command);
};

/**
 * 便捷方法 - 执行命令
 */
export const executeCommand = (commandName: string, context: ICommandContext): Promise<ICommandResult> => {
  return defaultCommandSystem.execute(commandName, context);
};

/**
 * 便捷方法 - 使用中间件
 */
export const useMiddleware = (middleware: ICommandMiddleware): void => {
  defaultCommandSystem.use(middleware);
};

/**
 * 内置中间件集合
 */
export const builtinMiddleware = {
  /**
   * 日志中间件
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
        
        if (validRequests.length >= options.maxRequests) {
          throw new Error(`请求频率过高，请稍后再试 (限制: ${options.maxRequests}次/${options.windowMs}ms)`);
        }
        
        validRequests.push(now);
        requests.set(userId, validRequests);
        
        return context;
      }
    };
  }
};

// 导出默认实例
export default defaultCommandSystem; 