/**
 * 命令调度器实现
 * 
 * 提供命令执行、参数验证、权限检查、中间件处理等核心功能。
 * 调度器是命令系统的执行引擎，负责协调各个组件完成命令的安全执行。
 * 
 * @author Lavel Team
 * @since 1.0.0
 * 
 * @example
 * ```typescript
 * const dispatcher = createCommandDispatcher(registry, {
 *   debug: true,
 *   timeout: 5000,
 *   enableAuth: true
 * });
 * 
 * // 添加全局中间件
 * dispatcher.use(loggingMiddleware);
 * 
 * // 执行命令
 * const result = await dispatcher.execute('myCommand', context);
 * ```
 */

import { 
  ICommand, 
  ICommandContext, 
  ICommandResult, 
  ICommandDispatcher, 
  ICommandMiddleware, 
  ICommandRegistry, 
  ICommandParameter,
  ICommandSystemConfig,
  ICommandEventEmitter
} from './types';

/**
 * 参数验证工具类
 * 
 * 提供命令参数的类型验证和规则检查功能。
 * 支持多种数据类型和复杂的验证规则。
 * 
 * @internal
 * @since 1.0.0
 */
class ParameterValidator {
  /**
   * 验证命令参数
   * 
   * 根据参数定义对传入的参数进行全面验证，包括类型检查、必需性检查、
   * 默认值设置和自定义验证规则。
   * 
   * @param parameters - 参数定义列表
   * @param args - 实际传入的参数对象
   * @returns 验证结果，包含是否有效和错误信息列表
   * 
   * @example
   * ```typescript
   * const result = ParameterValidator.validate(
   *   [
   *     { name: 'name', type: 'string', required: true },
   *     { name: 'age', type: 'number', validation: { min: 0, max: 120 } }
   *   ],
   *   { name: 'John', age: 25 }
   * );
   * 
   * if (result.valid) {
   *   console.log('参数验证通过');
   * } else {
   *   console.error('验证错误:', result.errors);
   * }
   * ```
   */
  static validate(parameters: ICommandParameter[], args: Record<string, any>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const param of parameters) {
      const value = args[param.name];

      // 检查必需参数
      if (param.required && (value === undefined || value === null)) {
        errors.push(`缺少必需参数: ${param.name}`);
        continue;
      }

      // 如果参数不存在且有默认值，设置默认值
      if (value === undefined && param.defaultValue !== undefined) {
        args[param.name] = param.defaultValue;
        continue;
      }

      // 如果参数存在，验证类型和规则
      if (value !== undefined) {
        const typeError = this.validateType(param, value);
        if (typeError) {
          errors.push(typeError);
        }

        const validationError = this.validateRules(param, value);
        if (validationError) {
          errors.push(validationError);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * 验证参数类型
   * 
   * 检查参数值是否符合定义的数据类型。
   * 
   * @param param - 参数定义
   * @param value - 参数值
   * @returns 类型错误信息，如果类型正确则返回null
   * 
   * @private
   */
  private static validateType(param: ICommandParameter, value: any): string | null {
    const expectedType = param.type;
    const actualType = Array.isArray(value) ? 'array' : typeof value;

    if (expectedType === 'object' && actualType !== 'object') {
      return `参数 '${param.name}' 应该是对象类型，实际为 ${actualType}`;
    }

    if (expectedType !== 'object' && expectedType !== actualType) {
      return `参数 '${param.name}' 应该是 ${expectedType} 类型，实际为 ${actualType}`;
    }

    return null;
  }

  /**
   * 验证参数规则
   * 
   * 根据参数定义中的validation规则对参数值进行验证，
   * 包括正则表达式、数值范围、字符串长度、枚举值等。
   * 
   * @param param - 参数定义
   * @param value - 参数值
   * @returns 验证错误信息，如果验证通过则返回null
   * 
   * @private
   */
  private static validateRules(param: ICommandParameter, value: any): string | null {
    const { validation } = param;
    if (!validation) return null;

    // 正则表达式验证
    if (validation.pattern && typeof value === 'string') {
      if (!validation.pattern.test(value)) {
        return `参数 '${param.name}' 不符合格式要求`;
      }
    }

    // 数值范围验证
    if (typeof value === 'number') {
      if (validation.min !== undefined && value < validation.min) {
        return `参数 '${param.name}' 的值不能小于 ${validation.min}`;
      }
      if (validation.max !== undefined && value > validation.max) {
        return `参数 '${param.name}' 的值不能大于 ${validation.max}`;
      }
    }

    // 字符串长度验证
    if (typeof value === 'string') {
      if (validation.min !== undefined && value.length < validation.min) {
        return `参数 '${param.name}' 的长度不能少于 ${validation.min} 个字符`;
      }
      if (validation.max !== undefined && value.length > validation.max) {
        return `参数 '${param.name}' 的长度不能超过 ${validation.max} 个字符`;
      }
    }

    // 枚举值验证
    if (validation.enum && !validation.enum.includes(value)) {
      return `参数 '${param.name}' 的值必须是 [${validation.enum.join(', ')}] 中的一个`;
    }

    return null;
  }
}

/**
 * 命令调度器实现类
 * 
 * 负责命令的完整执行流程，包括参数验证、权限检查、中间件处理、
 * 超时控制和错误处理。这是命令系统的执行核心。
 * 
 * @public
 * @since 1.0.0
 * 
 * @example
 * ```typescript
 * const dispatcher = new CommandDispatcher(registry, {
 *   debug: true,
 *   timeout: 10000,
 *   enableAuth: true,
 *   errorHandler: (error, context) => {
 *     console.error('Command failed:', error.message);
 *   }
 * });
 * 
 * // 添加中间件
 * dispatcher.use(performanceMiddleware);
 * 
 * // 执行命令
 * const result = await dispatcher.execute('command', context);
 * ```
 */
export class CommandDispatcher implements ICommandDispatcher {
  /** @internal 命令注册表引用 */
  private registry: ICommandRegistry;
  
  /** @internal 全局中间件列表 */
  private globalMiddleware: ICommandMiddleware[] = [];
  
  /** @internal 系统配置 */
  private config: ICommandSystemConfig;
  
  /** @internal 事件发射器引用 */
  private eventEmitter?: ICommandEventEmitter;

  /**
   * 创建命令调度器实例
   * 
   * @param registry - 命令注册表实例
   * @param config - 系统配置选项
   * @param eventEmitter - 可选的事件发射器
   * 
   * @example
   * ```typescript
   * const dispatcher = new CommandDispatcher(registry, {
   *   debug: true,
   *   timeout: 5000,
   *   enableAuth: true,
   *   enableLogging: true
   * });
   * ```
   */
  constructor(
    registry: ICommandRegistry, 
    config: ICommandSystemConfig = {},
    eventEmitter?: ICommandEventEmitter
  ) {
    this.registry = registry;
    this.config = {
      debug: false,
      timeout: 30000,
      enableAuth: true,
      enableLogging: true,
      ...config
    };
    this.eventEmitter = eventEmitter;
  }

  /**
   * 执行命令
   * 
   * 完整的命令执行流程，包括：
   * 1. 命令查找和验证
   * 2. 权限检查
   * 3. 参数验证和转换
   * 4. 中间件前置处理
   * 5. 命令执行
   * 6. 中间件后置处理
   * 7. 结果返回和事件触发
   * 
   * @param commandName - 要执行的命令名称或别名
   * @param context - 命令执行上下文
   * @returns 命令执行结果的Promise
   * 
   * @example
   * ```typescript
   * const result = await dispatcher.execute('user:create', {
   *   args: { username: 'john', email: 'john@example.com' },
   *   env: { apiUrl: 'https://api.example.com' },
   *   user: { id: 'admin', permissions: ['user:create'] }
   * });
   * 
   * if (result.success) {
   *   console.log('用户创建成功:', result.data);
   * } else {
   *   console.error('创建失败:', result.error);
   * }
   * ```
   */
  async execute(commandName: string, context: ICommandContext): Promise<ICommandResult> {
    const startTime = Date.now();

    try {
      // 触发执行开始事件
      this.emitEvent('command.executing', commandName, { context });

      // 获取命令
      const command = this.registry.get(commandName);
      if (!command) {
        const error = `命令 '${commandName}' 不存在`;
        this.emitEvent('command.error', commandName, { error });
        return { success: false, error, executionTime: Date.now() - startTime };
      }

      // 权限验证
      if (this.config.enableAuth && command.requireAuth) {
        const authResult = this.validateAuth(command, context);
        if (!authResult.success) {
          this.emitEvent('command.error', commandName, { error: authResult.error });
          return authResult;
        }
      }

      // 参数验证
      if (command.parameters) {
        const validation = ParameterValidator.validate(command.parameters, context.args);
        if (!validation.valid) {
          const error = `参数验证失败: ${validation.errors.join(', ')}`;
          this.emitEvent('command.error', commandName, { error });
          return { success: false, error, executionTime: Date.now() - startTime };
        }
      }

      // 自定义验证
      if (command.validate) {
        const isValid = await Promise.resolve(command.validate(context));
        if (!isValid) {
          const error = '命令验证失败';
          this.emitEvent('command.error', commandName, { error });
          return { success: false, error, executionTime: Date.now() - startTime };
        }
      }

      // 收集所有中间件
      const allMiddleware = [
        ...this.globalMiddleware,
        ...(command.middleware || [])
      ].sort((a, b) => (a.order || 0) - (b.order || 0));

      // 执行前置中间件
      let processedContext = { ...context };
      for (const middleware of allMiddleware) {
        if (middleware.before) {
          try {
            processedContext = await Promise.resolve(middleware.before(processedContext));
          } catch (error) {
            this.log(`中间件 '${middleware.name}' 前置处理失败:`, error);
            if (middleware.onError) {
              const errorResult = await Promise.resolve(middleware.onError(processedContext, error as Error));
              this.emitEvent('command.error', commandName, { error: errorResult.error });
              return errorResult;
            }
            throw error;
          }
        }
      }

      // 执行命令
      let result: ICommandResult;
      if (this.config.timeout) {
        result = await this.executeWithTimeout(command, processedContext, this.config.timeout);
      } else {
        result = await Promise.resolve(command.execute(processedContext));
      }

      // 执行后置中间件
      for (const middleware of allMiddleware.reverse()) {
        if (middleware.after) {
          try {
            result = await Promise.resolve(middleware.after(processedContext, result));
          } catch (error) {
            this.log(`中间件 '${middleware.name}' 后置处理失败:`, error);
            if (middleware.onError) {
              const errorResult = await Promise.resolve(middleware.onError(processedContext, error as Error));
              this.emitEvent('command.error', commandName, { error: errorResult.error });
              return errorResult;
            }
            throw error;
          }
        }
      }

      // 添加执行时间
      result.executionTime = Date.now() - startTime;

      // 触发执行完成事件
      this.emitEvent('command.executed', commandName, { context: processedContext, result });

      this.log(`命令 '${commandName}' 执行完成`, result);
      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.log(`命令 '${commandName}' 执行失败:`, error);
      
      // 自定义错误处理
      if (this.config.errorHandler) {
        this.config.errorHandler(error as Error, context);
      }

      this.emitEvent('command.error', commandName, { error: errorMessage });
      
      return { 
        success: false, 
        error: errorMessage, 
        executionTime 
      };
    }
  }

  /**
   * 批量执行命令
   * 
   * 按顺序执行多个命令，前一个命令完成后再执行下一个。
   * 如果某个命令失败，后续命令仍会继续执行。
   * 
   * @param commands - 要执行的命令列表，包含命令名和上下文
   * @returns 所有命令执行结果的Promise数组
   * 
   * @example
   * ```typescript
   * const results = await dispatcher.executeBatch([
   *   { name: 'validate', context: validationContext },
   *   { name: 'process', context: processContext },
   *   { name: 'cleanup', context: cleanupContext }
   * ]);
   * 
   * results.forEach((result, index) => {
   *   console.log(`命令 ${index + 1} 执行结果:`, result.success ? '成功' : '失败');
   * });
   * ```
   */
  async executeBatch(commands: Array<{ name: string; context: ICommandContext }>): Promise<ICommandResult[]> {
    const results: ICommandResult[] = [];
    
    for (const { name, context } of commands) {
      const result = await this.execute(name, context);
      results.push(result);
      
      // 如果某个命令失败且需要停止执行，可以在这里添加逻辑
    }
    
    return results;
  }

  /**
   * 并行批量执行命令
   * 
   * 同时执行多个命令，所有命令并行运行。
   * 适用于命令之间无依赖关系的场景。
   * 
   * @param commands - 要执行的命令列表
   * @returns 所有命令执行结果的Promise数组
   * 
   * @example
   * ```typescript
   * const results = await dispatcher.executeBatchParallel([
   *   { name: 'fetchUser', context: userContext },
   *   { name: 'fetchSettings', context: settingsContext },
   *   { name: 'fetchLogs', context: logsContext }
   * ]);
   * 
   * // 所有命令并行执行完成
   * const [userResult, settingsResult, logsResult] = results;
   * ```
   */
  async executeBatchParallel(commands: Array<{ name: string; context: ICommandContext }>): Promise<ICommandResult[]> {
    const promises = commands.map(({ name, context }) => this.execute(name, context));
    return Promise.all(promises);
  }

  /**
   * 添加全局中间件
   * 
   * 添加应用于所有命令的中间件。中间件会根据order属性自动排序。
   * 
   * @param middleware - 要添加的中间件定义
   * 
   * @example
   * ```typescript
   * dispatcher.use({
   *   name: 'performance-monitor',
   *   order: -100,
   *   before: (context) => {
   *     context.env.startTime = Date.now();
   *     return context;
   *   },
   *   after: (context, result) => {
   *     const duration = Date.now() - context.env.startTime;
   *     result.metadata = { ...result.metadata, duration };
   *     return result;
   *   }
   * });
   * ```
   */
  use(middleware: ICommandMiddleware): void {
    this.globalMiddleware.push(middleware);
    // 按顺序排序
    this.globalMiddleware.sort((a, b) => (a.order || 0) - (b.order || 0));
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
   * const removed = dispatcher.removeMiddleware('performance-monitor');
   * if (removed) {
   *   console.log('中间件已移除');
   * } else {
   *   console.log('中间件不存在');
   * }
   * ```
   */
  removeMiddleware(middlewareName: string): boolean {
    const index = this.globalMiddleware.findIndex(m => m.name === middlewareName);
    if (index > -1) {
      this.globalMiddleware.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * 权限验证
   * 
   * 检查用户是否有权限执行指定命令。验证用户身份和所需权限。
   * 
   * @param command - 要执行的命令定义
   * @param context - 命令执行上下文
   * @returns 权限验证结果
   * 
   * @private
   */
  private validateAuth(command: ICommand, context: ICommandContext): ICommandResult {
    if (!context.user) {
      return { success: false, error: '需要用户身份验证' };
    }

    if (command.permissions && command.permissions.length > 0) {
      const hasPermission = command.permissions.some(permission => 
        context.user!.permissions.includes(permission)
      );
      
      if (!hasPermission) {
        return { 
          success: false, 
          error: `权限不足，需要以下权限之一: ${command.permissions.join(', ')}` 
        };
      }
    }

    return { success: true };
  }

  /**
   * 带超时的命令执行
   * 
   * 在指定时间内执行命令，如果超时则自动取消执行。
   * 
   * @param command - 要执行的命令
   * @param context - 命令执行上下文
   * @param timeout - 超时时间（毫秒）
   * @returns 命令执行结果的Promise
   * 
   * @throws {Error} 当命令执行超时时抛出错误
   * 
   * @private
   */
  private async executeWithTimeout(
    command: ICommand, 
    context: ICommandContext, 
    timeout: number
  ): Promise<ICommandResult> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`命令执行超时 (${timeout}ms)`));
      }, timeout);

      Promise.resolve(command.execute(context))
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * 触发事件
   * 
   * 通过事件发射器发送命令执行相关的事件。
   * 
   * @param type - 事件类型
   * @param commandName - 命令名称
   * @param data - 事件数据
   * 
   * @private
   */
  private emitEvent(type: 'command.executing' | 'command.executed' | 'command.error', commandName: string, data?: any): void {
    if (this.eventEmitter) {
      this.eventEmitter.emit({
        type,
        commandName,
        timestamp: Date.now(),
        data,
        error: type === 'command.error' ? new Error(data?.error) : undefined
      });
    }
  }

  /**
   * 日志输出
   * 
   * 根据配置输出调试和执行日志信息。
   * 
   * @param message - 日志消息
   * @param data - 可选的额外数据
   * 
   * @private
   */
  private log(message: string, data?: any): void {
    if (this.config.enableLogging && this.config.debug) {
      console.log(`[CommandDispatcher] ${message}`, data || '');
    }
  }
}

/**
 * 创建命令调度器实例
 * 
 * 工厂函数，用于创建和配置命令调度器实例。
 * 
 * @param registry - 命令注册表实例
 * @param config - 可选的系统配置
 * @param eventEmitter - 可选的事件发射器
 * @returns 新的命令调度器实例
 * 
 * @example
 * ```typescript
 * const dispatcher = createCommandDispatcher(registry, {
 *   debug: true,
 *   timeout: 10000,
 *   enableAuth: true
 * }, eventEmitter);
 * ```
 */
export const createCommandDispatcher = (
  registry: ICommandRegistry, 
  config?: ICommandSystemConfig,
  eventEmitter?: ICommandEventEmitter
): CommandDispatcher => {
  return new CommandDispatcher(registry, config, eventEmitter);
}; 