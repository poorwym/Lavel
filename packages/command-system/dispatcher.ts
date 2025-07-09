/**
 * 命令调度器实现
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
 * 参数验证工具
 */
class ParameterValidator {
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
 * 命令调度器实现
 */
export class CommandDispatcher implements ICommandDispatcher {
  private registry: ICommandRegistry;
  private globalMiddleware: ICommandMiddleware[] = [];
  private config: ICommandSystemConfig;
  private eventEmitter?: ICommandEventEmitter;

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
   */
  async executeBatchParallel(commands: Array<{ name: string; context: ICommandContext }>): Promise<ICommandResult[]> {
    const promises = commands.map(({ name, context }) => this.execute(name, context));
    return Promise.all(promises);
  }

  /**
   * 设置全局中间件
   */
  use(middleware: ICommandMiddleware): void {
    this.globalMiddleware.push(middleware);
    // 按顺序排序
    this.globalMiddleware.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  /**
   * 移除全局中间件
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
   */
  private log(message: string, data?: any): void {
    if (this.config.enableLogging && this.config.debug) {
      console.log(`[CommandDispatcher] ${message}`, data || '');
    }
  }
}

/**
 * 创建命令调度器实例
 */
export const createCommandDispatcher = (
  registry: ICommandRegistry, 
  config?: ICommandSystemConfig,
  eventEmitter?: ICommandEventEmitter
): CommandDispatcher => {
  return new CommandDispatcher(registry, config, eventEmitter);
}; 