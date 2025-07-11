/**
 * 命令系统类型定义
 * 
 * 此模块包含了命令系统的所有核心类型定义，提供了完整的类型安全和IDE支持。
 * 
 * @author Lavel Team
 * @since 1.0.0
 * @see {@link https://typedoc.org/guides/tags/ | TSDoc标准}
 */

/**
 * 命令上下文接口
 * 
 * 包含命令执行时的所有环境信息和参数。每个命令执行时都会接收一个上下文对象。
 * 
 * @public
 * @since 1.0.0
 * 
 * @example
 * ```typescript
 * const context: ICommandContext = {
 *   args: { name: "john", age: 25 },
 *   env: { NODE_ENV: "development" },
 *   user: { id: "user123", permissions: ["read", "write"] },
 *   session: { sessionId: "sess_abc123" }
 * };
 * ```
 */
export interface ICommandContext {
  /** 
   * 命令参数
   * 
   * 包含传递给命令的所有参数，键为参数名，值为参数值。
   * 参数会根据命令定义进行验证和类型转换。
   * 
   * @example
   * ```typescript
   * // 对于命令 "add --a=5 --b=3"
   * args: { a: 5, b: 3 }
   * ```
   */
  args: Record<string, any>;
  
  /** 
   * 执行环境
   * 
   * 包含环境变量、配置信息等上下文数据。
   * 可以用来传递全局配置或运行时状态。
   * 
   * @example
   * ```typescript
   * env: { 
   *   commandSystem: systemInstance,
   *   debug: true,
   *   apiUrl: "https://api.example.com"
   * }
   * ```
   */
  env: Record<string, any>;
  
  /** 
   * 用户信息
   * 
   * 当前执行命令的用户信息，包含用户ID和权限列表。
   * 如果用户未登录，此字段为undefined。
   * 
   * @example
   * ```typescript
   * user: {
   *   id: "user_123",
   *   permissions: ["user:read", "user:write", "admin"]
   * }
   * ```
   */
  user?: {
    /** 用户唯一标识符 */
    id: string;
    /** 用户权限列表，用于权限验证 */
    permissions: string[];
  };
  
  /** 
   * 会话信息
   * 
   * 包含当前会话的相关数据，如会话ID、临时状态等。
   * 可用于存储命令执行过程中的临时数据。
   */
  session?: Record<string, any>;
}

/**
 * 命令执行结果
 * 
 * 每个命令执行后都会返回此类型的结果对象，包含执行状态、数据和元信息。
 * 
 * @public
 * @since 1.0.0
 * 
 * @example
 * ```typescript
 * // 成功执行的结果
 * const successResult: ICommandResult = {
 *   success: true,
 *   data: { result: 42, message: "计算完成" },
 *   executionTime: 150,
 *   metadata: { operation: "add", cached: false }
 * };
 * 
 * // 失败的结果
 * const errorResult: ICommandResult = {
 *   success: false,
 *   error: "参数验证失败",
 *   executionTime: 5
 * };
 * ```
 */
export interface ICommandResult {
  /** 
   * 是否成功
   * 
   * true表示命令执行成功，false表示执行失败。
   * 失败时应该提供error字段说明失败原因。
   */
  success: boolean;
  
  /** 
   * 返回数据
   * 
   * 命令执行成功时返回的数据，类型可以是任意类型。
   * 建议使用明确的数据结构以便于后续处理。
   * 
   * @example
   * ```typescript
   * data: {
   *   users: [...],
   *   pagination: { page: 1, total: 100 },
   *   timestamp: Date.now()
   * }
   * ```
   */
  data?: any;
  
  /** 
   * 错误信息
   * 
   * 当success为false时，此字段包含错误描述信息。
   * 应该提供清晰、用户友好的错误说明。
   */
  error?: string;
  
  /** 
   * 执行时间(毫秒)
   * 
   * 命令执行所花费的时间，用于性能监控和优化。
   * 调度器会自动计算并设置此值。
   */
  executionTime?: number;
  
  /** 
   * 额外的元数据
   * 
   * 包含命令执行过程中产生的额外信息，如缓存状态、操作类型等。
   * 可用于日志记录、调试或后续处理。
   */
  metadata?: Record<string, any>;
}

/**
 * 命令定义接口
 * 
 * 定义一个可执行命令的所有属性和行为。每个命令都必须实现此接口。
 * 
 * @public
 * @since 1.0.0
 * 
 * @example
 * ```typescript
 * const addCommand: ICommand = {
 *   name: 'add',
 *   description: '执行加法运算',
 *   category: 'math',
 *   aliases: ['plus', '+'],
 *   requireAuth: false,
 *   parameters: [
 *     { name: 'a', type: 'number', required: true, description: '第一个数字' },
 *     { name: 'b', type: 'number', required: true, description: '第二个数字' }
 *   ],
 *   execute: async (context) => ({
 *     success: true,
 *     data: { result: context.args.a + context.args.b }
 *   })
 * };
 * ```
 */
export interface ICommand {
  /** 
   * 命令名称
   * 
   * 命令的唯一标识符，用于调用命令。
   * 必须是有效的标识符，不能包含空格或特殊字符。
   * 
   * @example "add", "user:create", "system:status"
   */
  name: string;
  
  /** 
   * 命令描述
   * 
   * 命令功能的简短描述，用于帮助文档和IDE提示。
   * 应该清晰地说明命令的作用。
   */
  description: string;
  
  /** 
   * 命令分组/类别
   * 
   * 用于将相关命令分组，便于管理和查找。
   * 常见的分类如：math, text, user, system等。
   * 
   * @example "math", "user", "system", "utility"
   */
  category?: string;
  
  /** 
   * 命令别名
   * 
   * 命令的替代名称，提供快捷方式。
   * 用户可以使用别名来调用命令。
   * 
   * @example ["plus", "+"] // 用于add命令
   */
  aliases?: string[];
  
  /** 
   * 是否需要权限验证
   * 
   * 设置为true时，命令执行前会进行用户认证检查。
   * 需要用户登录且具有相应权限才能执行。
   * 
   * @defaultValue false
   */
  requireAuth?: boolean;
  
  /** 
   * 所需权限列表
   * 
   * 执行此命令所需的权限列表。
   * 只有当用户具有列表中的任一权限时才能执行命令。
   * 
   * @example ["user:read", "admin"]
   */
  permissions?: string[];
  
  /** 
   * 参数定义
   * 
   * 命令接受的参数列表，包含参数类型、验证规则等。
   * 系统会根据定义自动进行参数验证和类型转换。
   */
  parameters?: ICommandParameter[];
  
  /** 
   * 命令执行函数
   * 
   * 命令的核心逻辑，接收上下文参数并返回执行结果。
   * 可以是同步或异步函数。
   * 
   * @param context - 命令执行上下文
   * @returns 命令执行结果
   * 
   * @example
   * ```typescript
   * execute: async (context: ICommandContext) => {
   *   const { name } = context.args;
   *   return {
   *     success: true,
   *     data: { greeting: `Hello, ${name}!` }
   *   };
   * }
   * ```
   */
  execute: (context: ICommandContext) => Promise<ICommandResult> | ICommandResult;
  
  /** 
   * 命令验证函数
   * 
   * 在参数验证之后、命令执行之前调用的自定义验证函数。
   * 可以实现复杂的业务逻辑验证。
   * 
   * @param context - 命令执行上下文
   * @returns 验证是否通过
   * 
   * @example
   * ```typescript
   * validate: async (context) => {
   *   const { start, end } = context.args;
   *   return start < end; // 确保开始时间小于结束时间
   * }
   * ```
   */
  validate?: (context: ICommandContext) => boolean | Promise<boolean>;
  
  /** 
   * 中间件
   * 
   * 应用于此命令的中间件列表，在命令执行前后进行额外处理。
   * 可用于日志记录、性能监控、权限检查等。
   */
  middleware?: ICommandMiddleware[];
}

/**
 * 命令参数定义
 * 
 * 定义命令参数的类型、验证规则和默认值等信息。
 * 
 * @public
 * @since 1.0.0
 * 
 * @example
 * ```typescript
 * const nameParam: ICommandParameter = {
 *   name: 'userName',
 *   description: '用户名',
 *   type: 'string',
 *   required: true,
 *   validation: {
 *     pattern: /^[a-zA-Z0-9_]+$/,
 *     min: 3,
 *     max: 20
 *   }
 * };
 * ```
 */
export interface ICommandParameter {
  /** 
   * 参数名
   * 
   * 参数的标识符，用于在args中访问参数值。
   * 必须是有效的JavaScript标识符。
   */
  name: string;
  
  /** 
   * 参数描述
   * 
   * 参数的功能说明，用于生成帮助文档和IDE提示。
   */
  description: string;
  
  /** 
   * 参数类型
   * 
   * 参数的数据类型，系统会根据类型进行验证和转换。
   * 支持基本类型和复合类型。
   */
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  
  /** 
   * 是否必需
   * 
   * 设置为true时，参数为必需参数，调用时必须提供。
   * 
   * @defaultValue false
   */
  required?: boolean;
  
  /** 
   * 默认值
   * 
   * 当参数未提供时使用的默认值。
   * 类型必须与参数类型兼容。
   * 
   * @example
   * ```typescript
   * // 字符串参数的默认值
   * defaultValue: "default_name"
   * 
   * // 数字参数的默认值
   * defaultValue: 0
   * 
   * // 数组参数的默认值
   * defaultValue: []
   * ```
   */
  defaultValue?: any;
  
  /** 
   * 参数验证规则
   * 
   * 定义参数值的验证约束，如正则表达式、数值范围、枚举值等。
   */
  validation?: {
    /** 
     * 正则表达式模式
     * 
     * 用于验证字符串参数的格式。
     * 
     * @example /^[a-zA-Z0-9]+$/ // 只允许字母和数字
     */
    pattern?: RegExp;
    
    /** 
     * 最小值/最小长度
     * 
     * 对于数字类型表示最小值，对于字符串类型表示最小长度。
     */
    min?: number;
    
    /** 
     * 最大值/最大长度
     * 
     * 对于数字类型表示最大值，对于字符串类型表示最大长度。
     */
    max?: number;
    
    /** 
     * 枚举值
     * 
     * 参数值必须是此数组中的一个值。
     * 
     * @example ["admin", "user", "guest"] // 角色枚举
     */
    enum?: any[];
  };
}

/**
 * 命令中间件接口
 * 
 * 定义在命令执行前后进行额外处理的中间件。
 * 可用于日志记录、性能监控、权限检查等横切关注点。
 * 
 * @public
 * @since 1.0.0
 * 
 * @example
 * ```typescript
 * const loggingMiddleware: ICommandMiddleware = {
 *   name: 'logger',
 *   order: -1000,
 *   before: (context) => {
 *     console.log(`执行命令: ${context.args}`);
 *     return context;
 *   },
 *   after: (context, result) => {
 *     console.log(`命令完成: ${result.success}`);
 *     return result;
 *   }
 * };
 * ```
 */
export interface ICommandMiddleware {
  /** 
   * 中间件名称
   * 
   * 中间件的唯一标识符，用于管理和调试。
   */
  name: string;
  
  /** 
   * 执行顺序(数字越小越先执行)
   * 
   * 控制多个中间件的执行顺序。
   * 负数表示在系统中间件之前执行，正数表示在系统中间件之后执行。
   * 
   * @defaultValue 0
   * @example -1000 // 最高优先级
   * @example 1000  // 最低优先级
   */
  order?: number;
  
  /** 
   * 前置处理
   * 
   * 在命令执行前调用，可以修改上下文或进行预处理。
   * 返回的上下文会传递给下一个中间件或命令。
   * 
   * @param context - 命令执行上下文
   * @returns 处理后的上下文
   * 
   * @throws 如果抛出异常，会触发onError处理
   */
  before?: (context: ICommandContext) => Promise<ICommandContext> | ICommandContext;
  
  /** 
   * 后置处理
   * 
   * 在命令执行后调用，可以修改结果或进行后处理。
   * 返回的结果会传递给下一个中间件或最终返回。
   * 
   * @param context - 命令执行上下文
   * @param result - 命令执行结果
   * @returns 处理后的结果
   * 
   * @throws 如果抛出异常，会触发onError处理
   */
  after?: (context: ICommandContext, result: ICommandResult) => Promise<ICommandResult> | ICommandResult;
  
  /** 
   * 错误处理
   * 
   * 当before或after方法抛出异常时调用。
   * 可以转换错误或提供默认结果。
   * 
   * @param context - 命令执行上下文
   * @param error - 发生的错误
   * @returns 错误处理结果
   */
  onError?: (context: ICommandContext, error: Error) => Promise<ICommandResult> | ICommandResult;
}

/**
 * 命令注册表接口
 * 
 * 管理命令的注册、注销和查询。提供命令的生命周期管理。
 * 
 * @public
 * @since 1.0.0
 * 
 * @example
 * ```typescript
 * const registry = createCommandRegistry();
 * registry.register(myCommand);
 * const command = registry.get('myCommand');
 * ```
 */
export interface ICommandRegistry {
  /** 
   * 注册命令
   * 
   * 将命令添加到注册表中，使其可以被调用。
   * 
   * @param command - 要注册的命令
   * @throws 如果命令名称已存在或命令定义无效
   * 
   * @example
   * ```typescript
   * registry.register({
   *   name: 'hello',
   *   description: 'Say hello',
   *   execute: () => ({ success: true, data: 'Hello!' })
   * });
   * ```
   */
  register(command: ICommand): void;
  
  /** 
   * 注销命令
   * 
   * 从注册表中移除命令，使其不再可用。
   * 
   * @param commandName - 要注销的命令名称
   * @returns 是否成功注销（false表示命令不存在）
   * 
   * @example
   * ```typescript
   * const success = registry.unregister('hello');
   * console.log(success); // true if command existed
   * ```
   */
  unregister(commandName: string): boolean;
  
  /** 
   * 获取命令
   * 
   * 根据命令名或别名获取命令定义。
   * 
   * @param commandName - 命令名称或别名
   * @returns 命令定义，如果不存在则返回undefined
   * 
   * @example
   * ```typescript
   * const command = registry.get('hello');
   * if (command) {
   *   console.log(command.description);
   * }
   * ```
   */
  get(commandName: string): ICommand | undefined;
  
  /** 
   * 获取所有命令
   * 
   * 返回注册表中的所有命令列表。
   * 
   * @returns 所有已注册的命令数组
   */
  getAll(): ICommand[];
  
  /** 
   * 根据分类获取命令
   * 
   * 获取指定分类下的所有命令。
   * 
   * @param category - 命令分类
   * @returns 该分类下的命令数组
   * 
   * @example
   * ```typescript
   * const mathCommands = registry.getByCategory('math');
   * ```
   */
  getByCategory(category: string): ICommand[];
  
  /** 
   * 检查命令是否存在
   * 
   * 检查指定名称的命令是否已注册。
   * 
   * @param commandName - 命令名称或别名
   * @returns 是否存在
   */
  has(commandName: string): boolean;
  
  /** 
   * 清空所有命令
   * 
   * 移除注册表中的所有命令。
   * 通常用于测试或重置系统状态。
   */
  clear(): void;
}

/**
 * 命令调度器接口
 * 
 * 负责命令的执行、中间件管理和批量操作。
 * 
 * @public
 * @since 1.0.0
 * 
 * @example
 * ```typescript
 * const dispatcher = createCommandDispatcher(registry);
 * const result = await dispatcher.execute('hello', { args: {}, env: {} });
 * ```
 */
export interface ICommandDispatcher {
  /** 
   * 执行命令
   * 
   * 根据命令名称执行指定命令，包括参数验证、权限检查、中间件处理等。
   * 
   * @param commandName - 要执行的命令名称
   * @param context - 命令执行上下文
   * @returns 命令执行结果
   * 
   * @example
   * ```typescript
   * const result = await dispatcher.execute('add', {
   *   args: { a: 1, b: 2 },
   *   env: {},
   *   user: { id: 'user1', permissions: [] }
   * });
   * ```
   */
  execute(commandName: string, context: ICommandContext): Promise<ICommandResult>;
  
  /** 
   * 批量执行命令
   * 
   * 按顺序执行多个命令，前一个命令完成后再执行下一个。
   * 
   * @param commands - 要执行的命令列表
   * @returns 所有命令的执行结果数组
   * 
   * @example
   * ```typescript
   * const results = await dispatcher.executeBatch([
   *   { name: 'cmd1', context: ctx1 },
   *   { name: 'cmd2', context: ctx2 }
   * ]);
   * ```
   */
  executeBatch(commands: Array<{ name: string; context: ICommandContext }>): Promise<ICommandResult[]>;
  
  /** 
   * 设置全局中间件
   * 
   * 添加应用于所有命令的中间件。
   * 
   * @param middleware - 要添加的中间件
   * 
   * @example
   * ```typescript
   * dispatcher.use({
   *   name: 'logger',
   *   before: (ctx) => { console.log('Before:', ctx.args); return ctx; }
   * });
   * ```
   */
  use(middleware: ICommandMiddleware): void;
  
  /** 
   * 移除全局中间件
   * 
   * 根据名称移除已注册的全局中间件。
   * 
   * @param middlewareName - 要移除的中间件名称
   * @returns 是否成功移除
   */
  removeMiddleware(middlewareName: string): boolean;
}

/**
 * 命令系统配置
 * 
 * 配置命令系统的行为和特性。
 * 
 * @public
 * @since 1.0.0
 * 
 * @example
 * ```typescript
 * const config: ICommandSystemConfig = {
 *   debug: true,
 *   timeout: 5000,
 *   enableAuth: true,
 *   enableLogging: true,
 *   errorHandler: (error, context) => {
 *     console.error('Command error:', error.message);
 *   }
 * };
 * ```
 */
export interface ICommandSystemConfig {
  /** 
   * 是否启用调试模式
   * 
   * 启用后会输出详细的执行日志和调试信息。
   * 
   * @defaultValue false
   */
  debug?: boolean;
  
  /** 
   * 默认超时时间(毫秒)
   * 
   * 命令执行的最大时间限制，超时会自动取消执行。
   * 设置为0或undefined表示不限制超时。
   * 
   * @defaultValue 30000
   */
  timeout?: number;
  
  /** 
   * 是否启用权限验证
   * 
   * 控制是否对需要权限的命令进行验证。
   * 
   * @defaultValue true
   */
  enableAuth?: boolean;
  
  /** 
   * 是否启用执行日志
   * 
   * 控制是否记录命令执行的日志信息。
   * 
   * @defaultValue true
   */
  enableLogging?: boolean;
  
  /** 
   * 自定义错误处理器
   * 
   * 当命令执行出错时调用的自定义处理函数。
   * 可用于错误收集、日志记录等。
   * 
   * @param error - 发生的错误
   * @param context - 命令执行上下文
   */
  errorHandler?: (error: Error, context: ICommandContext) => void;
}

/**
 * 事件类型
 * 
 * 命令系统支持的所有事件类型。
 * 
 * @public
 * @since 1.0.0
 */
export type CommandEventType = 
  | 'command.registered'   /** 命令注册事件 */
  | 'command.unregistered' /** 命令注销事件 */
  | 'command.executing'    /** 命令开始执行事件 */
  | 'command.executed'     /** 命令执行完成事件 */
  | 'command.error';       /** 命令执行错误事件 */

/**
 * 命令事件接口
 * 
 * 命令系统发出的事件的统一格式。
 * 
 * @public
 * @since 1.0.0
 * 
 * @example
 * ```typescript
 * const event: ICommandEvent = {
 *   type: 'command.executed',
 *   commandName: 'hello',
 *   timestamp: Date.now(),
 *   data: { result: 'success' }
 * };
 * ```
 */
export interface ICommandEvent {
  /** 
   * 事件类型
   * 
   * 标识事件的具体类型，用于事件过滤和处理。
   */
  type: CommandEventType;
  
  /** 
   * 命令名称
   * 
   * 触发事件的命令名称。
   */
  commandName: string;
  
  /** 
   * 事件时间戳
   * 
   * 事件发生的时间，使用毫秒级Unix时间戳。
   */
  timestamp: number;
  
  /** 
   * 事件数据
   * 
   * 事件相关的额外数据，内容根据事件类型而异。
   * 
   * @example
   * // 注册事件的数据
   * data: { command: ICommand }
   * 
   * // 执行事件的数据
   * data: { context: ICommandContext, result?: ICommandResult }
   */
  data?: any;
  
  /** 
   * 错误信息(如果有)
   * 
   * 当事件类型为'command.error'时包含的错误信息。
   */
  error?: Error;
}

/**
 * 事件监听器类型
 * 
 * 处理命令事件的回调函数类型。
 * 
 * @public
 * @since 1.0.0
 * 
 * @param event - 命令事件对象
 * 
 * @example
 * ```typescript
 * const listener: CommandEventListener = (event) => {
 *   console.log(`Event: ${event.type} for command: ${event.commandName}`);
 * };
 * ```
 */
export type CommandEventListener = (event: ICommandEvent) => void;

/**
 * 事件发射器接口
 * 
 * 管理事件监听器的注册和事件的发射。
 * 
 * @public
 * @since 1.0.0
 * 
 * @example
 * ```typescript
 * const emitter = registry.getEventEmitter();
 * emitter.on('command.executed', (event) => {
 *   console.log('Command executed:', event.commandName);
 * });
 * ```
 */
export interface ICommandEventEmitter {
  /** 
   * 添加事件监听器
   * 
   * 注册一个事件监听器来处理特定类型的事件。
   * 
   * @param eventType - 要监听的事件类型
   * @param listener - 事件处理函数
   * 
   * @example
   * ```typescript
   * emitter.on('command.error', (event) => {
   *   console.error('Command failed:', event.error?.message);
   * });
   * ```
   */
  on(eventType: CommandEventType, listener: CommandEventListener): void;
  
  /** 
   * 移除事件监听器
   * 
   * 取消注册指定的事件监听器。
   * 
   * @param eventType - 事件类型
   * @param listener - 要移除的监听器函数
   */
  off(eventType: CommandEventType, listener: CommandEventListener): void;
  
  /** 
   * 触发事件
   * 
   * 发射一个事件，通知所有相关的监听器。
   * 
   * @param event - 要发射的事件对象
   * 
   * @internal
   * 此方法通常由系统内部调用，不建议用户直接使用。
   */
  emit(event: ICommandEvent): void;
} 