/**
 * @fileoverview 撤销系统主入口模块
 * 
 * 提供撤销系统的完整 API，包括：
 * - 核心类型和接口定义
 * - 撤销管理器实现
 * - 中间件系统
 * - 内置命令集合
 * - 系统集成工具
 * 
 * @author alex
 * @since 1.0.0
 * @version 1.0.0
 * @public
 */

// 导出所有类型定义
export * from './types';

// 导出核心类
export { UndoManager, createUndoManager } from './undo-manager';

// 导出中间件
export {
  createUndoMiddleware,
  createTransactionMiddleware,
  createHistoryLimitMiddleware,
  createUndoAwareMiddleware,
  createCombinedUndoMiddleware
} from './middleware';

// 导出内置命令
export {
  undoCommand,
  redoCommand,
  undoHistoryCommand,
  clearHistoryCommand,
  beginTransactionCommand,
  commitTransactionCommand,
  rollbackTransactionCommand,
  undoStatusCommand,
  undoCommands,
  UndoCommandLoader
} from './commands';

// 导入依赖
import { CommandSystem } from '@lavel/command-system';
import { UndoManager, createUndoManager } from './undo-manager';
import { 
  createCombinedUndoMiddleware
} from './middleware';
import { UndoCommandLoader } from './commands';
import { IUndoManagerConfig, IUndoableCommand, ICommandSnapshot } from './types';

/**
 * 撤销系统配置接口
 * 
 * 扩展撤销管理器配置，添加系统集成相关的配置选项。
 * 用于配置撤销系统与命令系统的集成行为。
 * 
 * @example
 * ```typescript
 * const config: IUndoSystemConfig = {
 *   // 撤销管理器配置
 *   historyLimit: 100,
 *   debug: true,
 *   enableTransactions: true,
 *   
 *   // 系统集成配置
 *   autoRegisterCommands: true,
 *   autoApplyMiddleware: true,
 *   
 *   // 中间件配置
 *   middlewareConfig: {
 *     autoRecord: true,
 *     filter: (command) => command.category !== 'query',
 *     transformSnapshot: (snapshot) => {
 *       // 清理敏感信息
 *       const cleaned = { ...snapshot };
 *       if (cleaned.context.args.password) {
 *         cleaned.context.args.password = '[REDACTED]';
 *       }
 *       return cleaned;
 *     }
 *   }
 * };
 * ```
 * 
 * @public
 * @since 1.0.0
 */
export interface IUndoSystemConfig extends IUndoManagerConfig {
  /**
   * 是否自动注册撤销命令
   * 
   * 当设置为 true 时，系统会自动注册所有内置的撤销相关命令
   * （如 undo、redo、history 等）到命令系统中。
   * 
   * @defaultValue true
   * @example
   * ```typescript
   * // 禁用自动注册，手动选择要注册的命令
   * autoRegisterCommands: false
   * ```
   * 
   * @public
   */
  autoRegisterCommands?: boolean;
  
  /**
   * 是否自动应用撤销中间件
   * 
   * 当设置为 true 时，系统会自动配置和应用撤销中间件，
   * 实现命令执行的自动记录。
   * 
   * @defaultValue true
   * @example
   * ```typescript
   * // 禁用自动中间件，手动控制记录时机
   * autoApplyMiddleware: false
   * ```
   * 
   * @public
   */
  autoApplyMiddleware?: boolean;
  
  /**
   * 中间件配置选项
   * 
   * 用于自定义撤销中间件的行为，包括过滤器、转换器等。
   * 只有在 autoApplyMiddleware 为 true 时才会生效。
   * 
   * @public
   */
  middlewareConfig?: {
    /** 是否自动记录命令 */
    autoRecord?: boolean;
    /** 命令过滤器函数 */
    filter?: (command: any, context: any) => boolean;
    /** 快照转换器函数 */
    transformSnapshot?: (snapshot: ICommandSnapshot) => ICommandSnapshot;
  };
}

/**
 * 撤销系统集成类
 * 
 * 提供与命令系统的无缝集成，是使用撤销系统的主要入口点。
 * 封装了撤销管理器、中间件配置和命令注册等复杂性，
 * 提供简单易用的 API。
 * 
 * @example
 * ```typescript
 * // 基本使用
 * const commandSystem = new CommandSystem();
 * const undoSystem = new UndoSystem(commandSystem, {
 *   historyLimit: 50,
 *   debug: true
 * });
 * 
 * // 执行命令（会自动记录到撤销历史）
 * await commandSystem.execute('deleteFile', { filename: 'test.txt' });
 * 
 * // 撤销操作
 * const success = await undoSystem.undo();
 * 
 * // 使用事务
 * const txId = undoSystem.beginTransaction('batchEdit');
 * await commandSystem.execute('editFile1', { content: 'new content 1' });
 * await commandSystem.execute('editFile2', { content: 'new content 2' });
 * undoSystem.commitTransaction(txId);
 * ```
 * 
 * @public
 * @since 1.0.0
 */
export class UndoSystem {
  private commandSystem: CommandSystem;
  private undoManager: UndoManager;
  private config: IUndoSystemConfig;

  /**
   * 创建撤销系统实例
   * 
   * @param commandSystem - 要集成的命令系统实例
   * @param config - 撤销系统配置选项
   * 
   * @example
   * ```typescript
   * const commandSystem = new CommandSystem();
   * const undoSystem = new UndoSystem(commandSystem, {
   *   historyLimit: 100,
   *   autoRegisterCommands: true,
   *   autoApplyMiddleware: true,
   *   middlewareConfig: {
   *     filter: (command) => command.undoable !== false
   *   }
   * });
   * ```
   */
  constructor(commandSystem: CommandSystem, config: IUndoSystemConfig = {}) {
    this.commandSystem = commandSystem;
    this.config = {
      autoRegisterCommands: true,
      autoApplyMiddleware: true,
      ...config
    };

    // 创建撤销管理器
    this.undoManager = createUndoManager(config);

    // 自动注册撤销命令
    if (this.config.autoRegisterCommands) {
      this.registerCommands();
    }

    // 自动应用中间件
    if (this.config.autoApplyMiddleware) {
      this.applyMiddleware();
    }
  }

  /**
   * 获取撤销管理器实例
   * 
   * 返回内部的撤销管理器，用于直接访问撤销管理器的高级功能。
   * 
   * @returns 撤销管理器实例
   * 
   * @example
   * ```typescript
   * const undoManager = undoSystem.getUndoManager();
   * 
   * // 监听撤销事件
   * undoManager.on('undo.executed', (event) => {
   *   console.log('撤销了:', event.snapshot?.commandName);
   * });
   * 
   * // 获取详细历史
   * const history = undoManager.getUndoHistory();
   * ```
   * 
   * @public
   */
  getUndoManager(): UndoManager {
    return this.undoManager;
  }

  /**
   * 注册撤销相关命令
   * 
   * 将所有内置的撤销命令注册到命令系统中。
   * 包括 undo、redo、history、clear 等命令。
   * 
   * @example
   * ```typescript
   * // 手动注册命令（如果 autoRegisterCommands 为 false）
   * undoSystem.registerCommands();
   * 
   * // 现在可以使用内置命令
   * await commandSystem.execute('undo');
   * await commandSystem.execute('redo');
   * await commandSystem.execute('undo:history');
   * ```
   * 
   * @public
   */
  registerCommands(): void {
    UndoCommandLoader.registerAllCommands(this.commandSystem);
  }

  /**
   * 应用撤销中间件
   * 
   * 配置并应用撤销中间件到命令系统中，实现命令执行的自动记录。
   * 
   * @example
   * ```typescript
   * // 手动应用中间件（如果 autoApplyMiddleware 为 false）
   * undoSystem.applyMiddleware();
   * 
   * // 现在执行的命令会自动记录到撤销历史
   * await commandSystem.execute('someCommand', { args: 'value' });
   * ```
   * 
   * @public
   */
  applyMiddleware(): void {
    const middlewares = createCombinedUndoMiddleware(
      this.undoManager,
      this.config.middlewareConfig
    );

    middlewares.forEach(middleware => {
      this.commandSystem.use(middleware);
    });
  }

  /**
   * 创建可撤销命令的静态辅助方法
   * 
   * 将普通命令转换为可撤销命令的便捷工具。
   * 
   * @param baseCommand - 基础命令对象
   * @param undoFunction - 撤销函数
   * @returns 可撤销命令对象
   * 
   * @example
   * ```typescript
   * const editCommand = UndoSystem.createUndoableCommand(
   *   {
   *     name: 'editText',
   *     description: '编辑文本',
   *     execute: async (context) => {
   *       const { text } = context.args;
   *       const oldText = getCurrentText();
   *       setCurrentText(text);
   *       
   *       context.env.previousState = { oldText };
   *       return { success: true, data: { newText: text } };
   *     }
   *   },
   *   async (snapshot) => {
   *     const { oldText } = snapshot.previousState;
   *     setCurrentText(oldText);
   *     return { success: true };
   *   }
   * );
   * 
   * commandSystem.register(editCommand);
   * ```
   * 
   * @public
   * @static
   */
  static createUndoableCommand(
    baseCommand: any,
    undoFunction: (snapshot: ICommandSnapshot) => any
  ): IUndoableCommand {
    return {
      ...baseCommand,
      undoable: true,
      undo: undoFunction
    };
  }

  /**
   * 执行撤销操作
   * 
   * 撤销最近的一个操作（命令或事务）。
   * 
   * @returns Promise 解析为撤销是否成功
   * 
   * @example
   * ```typescript
   * const success = await undoSystem.undo();
   * if (success) {
   *   console.log('撤销成功');
   * } else {
   *   console.log('没有可撤销的操作或撤销失败');
   * }
   * ```
   * 
   * @public
   */
  async undo(): Promise<boolean> {
    return this.undoManager.undo();
  }

  /**
   * 执行重做操作
   * 
   * 重做最近被撤销的操作。
   * 
   * @returns Promise 解析为重做是否成功
   * 
   * @example
   * ```typescript
   * const success = await undoSystem.redo();
   * if (success) {
   *   console.log('重做成功');
   * } else {
   *   console.log('没有可重做的操作或重做失败');
   * }
   * ```
   * 
   * @public
   */
  async redo(): Promise<boolean> {
    return this.undoManager.redo();
  }

  /**
   * 开始一个新事务
   * 
   * 创建事务来组织相关的命令操作。
   * 
   * @param name - 事务名称
   * @param description - 事务描述（可选）
   * @returns 事务的唯一标识符
   * 
   * @example
   * ```typescript
   * const txId = undoSystem.beginTransaction(
   *   'batchFileOperation',
   *   '批量处理用户选中的文件'
   * );
   * 
   * try {
   *   await commandSystem.execute('moveFile', { from: 'a.txt', to: 'b.txt' });
   *   await commandSystem.execute('renameFile', { file: 'c.txt', newName: 'd.txt' });
   *   undoSystem.commitTransaction(txId);
   * } catch (error) {
   *   undoSystem.rollbackTransaction(txId);
   *   throw error;
   * }
   * ```
   * 
   * @public
   */
  beginTransaction(name: string, description?: string): string {
    return this.undoManager.beginTransaction(name, description);
  }

  /**
   * 提交事务
   * 
   * 将事务中的所有命令作为一个整体添加到撤销历史中。
   * 
   * @param transactionId - 要提交的事务 ID
   * 
   * @example
   * ```typescript
   * const txId = undoSystem.beginTransaction('batchEdit');
   * // ... 执行多个命令
   * undoSystem.commitTransaction(txId);
   * 
   * // 现在可以一次性撤销整个事务
   * await undoSystem.undo();
   * ```
   * 
   * @throws 如果事务 ID 不存在或事务状态无效
   * @public
   */
  commitTransaction(transactionId: string): void {
    this.undoManager.commitTransaction(transactionId);
  }

  /**
   * 回滚事务
   * 
   * 撤销事务中的所有命令并丢弃事务。
   * 
   * @param transactionId - 要回滚的事务 ID
   * 
   * @example
   * ```typescript
   * const txId = undoSystem.beginTransaction('riskyOperation');
   * 
   * try {
   *   await commandSystem.execute('deleteImportantFile', { file: 'data.db' });
   *   await commandSystem.execute('modifyConfig', { key: 'critical', value: 'new' });
   *   
   *   // 如果一切正常，提交事务
   *   undoSystem.commitTransaction(txId);
   * } catch (error) {
   *   // 发生错误时回滚所有更改
   *   undoSystem.rollbackTransaction(txId);
   *   console.log('操作失败，已回滚所有更改');
   *   throw error;
   * }
   * ```
   * 
   * @throws 如果事务 ID 不存在
   * @public
   */
  rollbackTransaction(transactionId: string): void {
    this.undoManager.rollbackTransaction(transactionId);
  }
}

/**
 * 创建撤销系统实例的工厂函数
 * 
 * 提供创建撤销系统的便捷方法，是推荐的创建方式。
 * 
 * @param commandSystem - 要集成的命令系统实例
 * @param config - 撤销系统配置选项（可选）
 * @returns 新的撤销系统实例
 * 
 * @example
 * ```typescript
 * const commandSystem = new CommandSystem();
 * const undoSystem = createUndoSystem(commandSystem, {
 *   historyLimit: 200,
 *   debug: process.env.NODE_ENV === 'development',
 *   middlewareConfig: {
 *     filter: (command) => command.category !== 'query'
 *   }
 * });
 * 
 * // 系统已就绪，可以执行可撤销的命令
 * await commandSystem.execute('createFile', { name: 'test.txt' });
 * await undoSystem.undo(); // 撤销文件创建
 * ```
 * 
 * @public
 * @since 1.0.0
 */
export const createUndoSystem = (
  commandSystem: CommandSystem, 
  config?: IUndoSystemConfig
): UndoSystem => {
  return new UndoSystem(commandSystem, config);
};

/**
 * 可撤销命令装饰器
 * 
 * 用于将普通方法标记为可撤销命令的装饰器。
 * 这是一个实验性功能，主要用于基于类的命令定义。
 * 
 * @param undoFunction - 可选的撤销函数
 * @returns 装饰器函数
 * 
 * @example
 * ```typescript
 * class FileCommands {
 *   @Undoable(async (snapshot) => {
 *     const { oldContent } = snapshot.previousState;
 *     await fs.writeFile(snapshot.context.args.filename, oldContent);
 *     return { success: true };
 *   })
 *   async editFile(context: ICommandContext) {
 *     const { filename, content } = context.args;
 *     const oldContent = await fs.readFile(filename, 'utf-8');
 *     
 *     context.env.previousState = { oldContent };
 *     await fs.writeFile(filename, content);
 *     
 *     return { success: true, data: { filename, content } };
 *   }
 * }
 * ```
 * 
 * @experimental
 * @public
 */
export function Undoable(undoFunction?: (snapshot: ICommandSnapshot) => any) {
  return function(_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = function(...args: any[]) {
      const command = {
        ...this,
        undoable: true,
        undo: undoFunction
      };
      
      return originalMethod.apply(command, args);
    };
    
    return descriptor;
  };
}

/**
 * 创建简单值变更命令的工厂函数
 * 
 * 为简单的值变更操作快速创建可撤销命令。
 * 适用于状态变更、配置修改等场景。
 * 
 * @param name - 命令名称
 * @param description - 命令描述
 * @param getValue - 获取当前值的函数
 * @param setValue - 设置新值的函数
 * @returns 可撤销的值变更命令
 * 
 * @example
 * ```typescript
 * // 创建主题切换命令
 * const themeCommand = createValueChangeCommand(
 *   'changeTheme',
 *   '更改应用主题',
 *   () => getCurrentTheme(),
 *   (theme) => setCurrentTheme(theme)
 * );
 * 
 * commandSystem.register(themeCommand);
 * 
 * // 使用命令
 * await commandSystem.execute('changeTheme', { newValue: 'dark' });
 * await undoSystem.undo(); // 恢复到之前的主题
 * 
 * // 创建配置更新命令
 * const configCommand = createValueChangeCommand(
 *   'updateConfig',
 *   '更新配置项',
 *   () => config.getValue('apiUrl'),
 *   (value) => config.setValue('apiUrl', value)
 * );
 * ```
 * 
 * @public
 * @since 1.0.0
 */
export function createValueChangeCommand(
  name: string,
  description: string,
  getValue: () => any,
  setValue: (value: any) => void
): IUndoableCommand {
  return {
    name,
    description,
    category: 'value-change',
    undoable: true,
    
    parameters: [
      {
        name: 'newValue',
        description: '新值',
        type: 'string',
        required: true
      }
    ],
    
    execute: async (context) => {
      const { newValue } = context.args;
      const oldValue = getValue();
      
      // 存储旧值到上下文
      context.env.previousState = { oldValue };
      
      // 设置新值
      setValue(newValue);
      
      return {
        success: true,
        data: {
          oldValue,
          newValue
        }
      };
    },
    
    undo: async (snapshot) => {
      const { oldValue } = snapshot.previousState;
      setValue(oldValue);
      
      return {
        success: true,
        data: {
          restoredValue: oldValue
        }
      };
    },
    
    getUndoDescription: (snapshot) => {
      const { oldValue } = snapshot.previousState;
      return `撤销 ${description}：恢复为 ${oldValue}`;
    }
  };
}

/**
 * 批量执行带撤销支持的操作
 * 
 * 在事务中执行多个命令的便捷函数，提供原子性的撤销保证。
 * 
 * @param commandSystem - 命令系统实例
 * @param undoManager - 撤销管理器实例
 * @param operations - 要执行的操作列表
 * @param transactionName - 事务名称
 * @returns Promise 解析为所有操作的结果数组
 * 
 * @example
 * ```typescript
 * const results = await executeBatchWithUndo(
 *   commandSystem,
 *   undoManager,
 *   [
 *     { name: 'createFile', args: { filename: 'file1.txt', content: 'Hello' } },
 *     { name: 'createFile', args: { filename: 'file2.txt', content: 'World' } },
 *     { name: 'createFolder', args: { dirname: 'docs' } }
 *   ],
 *   'setupProject'
 * );
 * 
 * console.log('创建了', results.length, '个项目');
 * 
 * // 如果需要撤销，会一次性撤销所有操作
 * await undoManager.undo();
 * ```
 * 
 * @throws 如果任何操作失败，会自动回滚已执行的操作
 * @public
 * @since 1.0.0
 */
export async function executeBatchWithUndo(
  commandSystem: CommandSystem,
  undoManager: UndoManager,
  operations: Array<{ name: string; args: any }>,
  transactionName: string
): Promise<any[]> {
  const transactionId = undoManager.beginTransaction(transactionName);
  const results: any[] = [];
  
  try {
    for (const operation of operations) {
      const result = await commandSystem.execute(operation.name, operation.args);
      results.push(result);
      
      if (!result.success) {
        throw new Error(`操作失败: ${operation.name} - ${result.error}`);
      }
    }
    
    undoManager.commitTransaction(transactionId);
    return results;
    
  } catch (error) {
    undoManager.rollbackTransaction(transactionId);
    throw error;
  }
} 