/**
 * 命令系统类型定义
 */

/**
 * 命令上下文接口
 */
export interface ICommandContext {
  /** 命令参数 */
  args: Record<string, any>;
  /** 执行环境 */
  env: Record<string, any>;
  /** 用户信息 */
  user?: {
    id: string;
    permissions: string[];
  };
  /** 会话信息 */
  session?: Record<string, any>;
}

/**
 * 命令执行结果
 */
export interface ICommandResult {
  /** 是否成功 */
  success: boolean;
  /** 返回数据 */
  data?: any;
  /** 错误信息 */
  error?: string;
  /** 执行时间(毫秒) */
  executionTime?: number;
  /** 额外的元数据 */
  metadata?: Record<string, any>;
}

/**
 * 命令定义接口
 */
export interface ICommand {
  /** 命令名称 */
  name: string;
  /** 命令描述 */
  description: string;
  /** 命令分组/类别 */
  category?: string;
  /** 命令别名 */
  aliases?: string[];
  /** 是否需要权限验证 */
  requireAuth?: boolean;
  /** 所需权限列表 */
  permissions?: string[];
  /** 参数定义 */
  parameters?: ICommandParameter[];
  /** 命令执行函数 */
  execute: (context: ICommandContext) => Promise<ICommandResult> | ICommandResult;
  /** 命令验证函数 */
  validate?: (context: ICommandContext) => boolean | Promise<boolean>;
  /** 中间件 */
  middleware?: ICommandMiddleware[];
}

/**
 * 命令参数定义
 */
export interface ICommandParameter {
  /** 参数名 */
  name: string;
  /** 参数描述 */
  description: string;
  /** 参数类型 */
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  /** 是否必需 */
  required?: boolean;
  /** 默认值 */
  defaultValue?: any;
  /** 参数验证规则 */
  validation?: {
    pattern?: RegExp;
    min?: number;
    max?: number;
    enum?: any[];
  };
}

/**
 * 命令中间件接口
 */
export interface ICommandMiddleware {
  /** 中间件名称 */
  name: string;
  /** 执行顺序(数字越小越先执行) */
  order?: number;
  /** 前置处理 */
  before?: (context: ICommandContext) => Promise<ICommandContext> | ICommandContext;
  /** 后置处理 */
  after?: (context: ICommandContext, result: ICommandResult) => Promise<ICommandResult> | ICommandResult;
  /** 错误处理 */
  onError?: (context: ICommandContext, error: Error) => Promise<ICommandResult> | ICommandResult;
}

/**
 * 命令注册表接口
 */
export interface ICommandRegistry {
  /** 注册命令 */
  register(command: ICommand): void;
  /** 注销命令 */
  unregister(commandName: string): boolean;
  /** 获取命令 */
  get(commandName: string): ICommand | undefined;
  /** 获取所有命令 */
  getAll(): ICommand[];
  /** 根据分类获取命令 */
  getByCategory(category: string): ICommand[];
  /** 检查命令是否存在 */
  has(commandName: string): boolean;
  /** 清空所有命令 */
  clear(): void;
}

/**
 * 命令调度器接口
 */
export interface ICommandDispatcher {
  /** 执行命令 */
  execute(commandName: string, context: ICommandContext): Promise<ICommandResult>;
  /** 批量执行命令 */
  executeBatch(commands: Array<{ name: string; context: ICommandContext }>): Promise<ICommandResult[]>;
  /** 设置全局中间件 */
  use(middleware: ICommandMiddleware): void;
  /** 移除全局中间件 */
  removeMiddleware(middlewareName: string): boolean;
}

/**
 * 命令系统配置
 */
export interface ICommandSystemConfig {
  /** 是否启用调试模式 */
  debug?: boolean;
  /** 默认超时时间(毫秒) */
  timeout?: number;
  /** 是否启用权限验证 */
  enableAuth?: boolean;
  /** 是否启用执行日志 */
  enableLogging?: boolean;
  /** 自定义错误处理器 */
  errorHandler?: (error: Error, context: ICommandContext) => void;
}

/**
 * 事件类型
 */
export type CommandEventType = 
  | 'command.registered'
  | 'command.unregistered'
  | 'command.executing'
  | 'command.executed'
  | 'command.error';

/**
 * 命令事件接口
 */
export interface ICommandEvent {
  /** 事件类型 */
  type: CommandEventType;
  /** 命令名称 */
  commandName: string;
  /** 事件时间戳 */
  timestamp: number;
  /** 事件数据 */
  data?: any;
  /** 错误信息(如果有) */
  error?: Error;
}

/**
 * 事件监听器类型
 */
export type CommandEventListener = (event: ICommandEvent) => void;

/**
 * 事件发射器接口
 */
export interface ICommandEventEmitter {
  /** 添加事件监听器 */
  on(eventType: CommandEventType, listener: CommandEventListener): void;
  /** 移除事件监听器 */
  off(eventType: CommandEventType, listener: CommandEventListener): void;
  /** 触发事件 */
  emit(event: ICommandEvent): void;
} 