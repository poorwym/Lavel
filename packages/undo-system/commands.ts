/**
 * @fileoverview 撤销系统内置命令集合
 * 
 * 提供完整的撤销相关命令实现，包括：
 * - 基本撤销/重做命令
 * - 历史记录查看和管理
 * - 事务操作命令
 * - 状态查询命令
 * - 命令加载器
 * 
 * @author alex
 * @since 1.0.0
 * @version 1.0.0
 * @public
 */

import { ICommand, ICommandContext, ICommandResult } from '@lavel/command-system';
import { IUndoManager, IHistoryItem } from './types';

/**
 * 撤销命令
 * 
 * 执行撤销操作的基础命令。支持单步撤销和批量撤销，
 * 自动检查撤销的可用性并提供详细的执行结果。
 * 
 * @example
 * ```typescript
 * // 注册命令
 * commandSystem.register(undoCommand);
 * 
 * // 执行单步撤销
 * const result = await commandSystem.execute('undo');
 * 
 * // 执行批量撤销
 * const result = await commandSystem.execute('undo', { steps: 3 });
 * ```
 * 
 * @public
 * @since 1.0.0
 */
export const undoCommand: ICommand = {
  name: 'undo',
  description: '撤销上一个操作',
  category: 'undo',
  aliases: ['u', 'undo-last'],
  
  parameters: [
    {
      name: 'steps',
      description: '要撤销的步数',
      type: 'number',
      required: false,
      defaultValue: 1,
      validation: {
        min: 1,
        max: 100
      }
    }
  ],
  
  execute: async (context: ICommandContext): Promise<ICommandResult> => {
    const undoManager = context.env?.undoManager as IUndoManager;
    
    if (!undoManager) {
      return {
        success: false,
        error: '撤销管理器未初始化'
      };
    }
    
    const { steps } = context.args;
    
    if (steps === 1) {
      const success = await undoManager.undo();
      
      if (success) {
        return {
          success: true,
          data: {
            message: '撤销成功',
            canUndo: undoManager.canUndo(),
            canRedo: undoManager.canRedo()
          }
        };
      } else {
        return {
          success: false,
          error: undoManager.canUndo() ? '撤销失败' : '没有可撤销的操作'
        };
      }
    } else {
      const undoneCount = await undoManager.undoMany(steps);
      
      return {
        success: undoneCount > 0,
        data: {
          message: `成功撤销 ${undoneCount} 个操作`,
          requestedSteps: steps,
          actualSteps: undoneCount,
          canUndo: undoManager.canUndo(),
          canRedo: undoManager.canRedo()
        }
      };
    }
  }
};

/**
 * 重做命令
 * 
 * 执行重做操作的基础命令。支持单步重做和批量重做，
 * 自动检查重做的可用性并提供详细的执行结果。
 * 
 * @example
 * ```typescript
 * // 注册命令
 * commandSystem.register(redoCommand);
 * 
 * // 执行单步重做
 * const result = await commandSystem.execute('redo');
 * 
 * // 执行批量重做
 * const result = await commandSystem.execute('redo', { steps: 2 });
 * ```
 * 
 * @public
 * @since 1.0.0
 */
export const redoCommand: ICommand = {
  name: 'redo',
  description: '重做上一个被撤销的操作',
  category: 'undo',
  aliases: ['r', 'redo-last'],
  
  parameters: [
    {
      name: 'steps',
      description: '要重做的步数',
      type: 'number',
      required: false,
      defaultValue: 1,
      validation: {
        min: 1,
        max: 100
      }
    }
  ],
  
  execute: async (context: ICommandContext): Promise<ICommandResult> => {
    const undoManager = context.env?.undoManager as IUndoManager;
    
    if (!undoManager) {
      return {
        success: false,
        error: '撤销管理器未初始化'
      };
    }
    
    const { steps } = context.args;
    
    if (steps === 1) {
      const success = await undoManager.redo();
      
      if (success) {
        return {
          success: true,
          data: {
            message: '重做成功',
            canUndo: undoManager.canUndo(),
            canRedo: undoManager.canRedo()
          }
        };
      } else {
        return {
          success: false,
          error: undoManager.canRedo() ? '重做失败' : '没有可重做的操作'
        };
      }
    } else {
      const redoneCount = await undoManager.redoMany(steps);
      
      return {
        success: redoneCount > 0,
        data: {
          message: `成功重做 ${redoneCount} 个操作`,
          requestedSteps: steps,
          actualSteps: redoneCount,
          canUndo: undoManager.canUndo(),
          canRedo: undoManager.canRedo()
        }
      };
    }
  }
};

/**
 * 查看撤销历史命令
 * 
 * 查看和检索撤销历史记录的命令。支持不同的历史类型查看，
 * 可以限制返回的记录数量，并格式化输出便于显示。
 * 
 * @example
 * ```typescript
 * // 查看最近10个撤销记录
 * const result = await commandSystem.execute('undo:history');
 * 
 * // 查看最近20个重做记录
 * const result = await commandSystem.execute('undo:history', { 
 *   limit: 20, 
 *   type: 'redo' 
 * });
 * 
 * // 查看所有历史记录
 * const result = await commandSystem.execute('undo:history', { 
 *   limit: 100, 
 *   type: 'both' 
 * });
 * ```
 * 
 * @public
 * @since 1.0.0
 */
export const undoHistoryCommand: ICommand = {
  name: 'undo:history',
  description: '查看撤销历史记录',
  category: 'undo',
  aliases: ['history', 'undo-history'],
  
  parameters: [
    {
      name: 'limit',
      description: '显示的历史记录数量',
      type: 'number',
      required: false,
      defaultValue: 10,
      validation: {
        min: 1,
        max: 100
      }
    },
    {
      name: 'type',
      description: '历史类型：undo（撤销历史）或 redo（重做历史）',
      type: 'string',
      required: false,
      defaultValue: 'undo',
      validation: {
        enum: ['undo', 'redo', 'both']
      }
    }
  ],
  
  execute: async (context: ICommandContext): Promise<ICommandResult> => {
    const undoManager = context.env?.undoManager as IUndoManager;
    
    if (!undoManager) {
      return {
        success: false,
        error: '撤销管理器未初始化'
      };
    }
    
    const { limit, type } = context.args;
    
    /**
     * 格式化快照为历史项的辅助函数
     * 
     * @param snapshot - 命令快照
     * @returns 格式化的历史项
     */
    const formatSnapshot = (snapshot: any): IHistoryItem => {
      return {
        id: snapshot.id,
        type: snapshot.metadata?.isTransaction ? 'transaction' : 'command',
        displayName: snapshot.commandName,
        description: snapshot.command?.description,
        timestamp: snapshot.timestamp,
        canUndo: true
      };
    };
    
    const result: any = {
      canUndo: undoManager.canUndo(),
      canRedo: undoManager.canRedo()
    };
    
    if (type === 'undo' || type === 'both') {
      const undoHistory = undoManager.getUndoHistory();
      result.undoHistory = undoHistory
        .slice(-limit)
        .reverse()
        .map(formatSnapshot);
      result.totalUndoCount = undoHistory.length;
    }
    
    if (type === 'redo' || type === 'both') {
      const redoHistory = undoManager.getRedoHistory();
      result.redoHistory = redoHistory
        .slice(-limit)
        .reverse()
        .map(formatSnapshot);
      result.totalRedoCount = redoHistory.length;
    }
    
    return {
      success: true,
      data: result
    };
  }
};

/**
 * 清空撤销历史命令
 * 
 * 清空所有撤销和重做历史记录的危险命令。
 * 需要管理员权限和明确的确认才能执行。
 * 
 * @example
 * ```typescript
 * // 清空所有历史记录（需要确认）
 * const result = await commandSystem.execute('undo:clear', { 
 *   confirm: 'yes' 
 * });
 * ```
 * 
 * @public
 * @since 1.0.0
 */
export const clearHistoryCommand: ICommand = {
  name: 'undo:clear',
  description: '清空所有撤销历史记录',
  category: 'undo',
  aliases: ['clear-history'],
  requireAuth: true,
  permissions: ['admin', 'undo:clear'],
  
  parameters: [
    {
      name: 'confirm',
      description: '确认清空（输入 "yes" 确认）',
      type: 'string',
      required: true,
      validation: {
        enum: ['yes']
      }
    }
  ],
  
  execute: async (context: ICommandContext): Promise<ICommandResult> => {
    const undoManager = context.env?.undoManager as IUndoManager;
    
    if (!undoManager) {
      return {
        success: false,
        error: '撤销管理器未初始化'
      };
    }
    
    const { confirm } = context.args;
    
    if (confirm !== 'yes') {
      return {
        success: false,
        error: '必须输入 "yes" 确认清空操作'
      };
    }
    
    const undoCount = undoManager.getUndoHistory().length;
    const redoCount = undoManager.getRedoHistory().length;
    
    undoManager.clear();
    
    return {
      success: true,
      data: {
        message: '撤销历史已清空',
        clearedUndoCount: undoCount,
        clearedRedoCount: redoCount
      }
    };
  }
};

/**
 * 开始事务命令
 * 
 * 启动一个新的撤销事务的命令。事务允许将多个相关操作
 * 组织为一个逻辑单元，可以一次性撤销或重做。
 * 
 * @example
 * ```typescript
 * // 开始一个新事务
 * const result = await commandSystem.execute('undo:begin-transaction', {
 *   name: 'batchFileOperation',
 *   description: '批量文件操作'
 * });
 * 
 * const transactionId = result.data.transactionId;
 * ```
 * 
 * @public
 * @since 1.0.0
 */
export const beginTransactionCommand: ICommand = {
  name: 'undo:begin-transaction',
  description: '开始一个新的撤销事务',
  category: 'undo',
  aliases: ['begin-tx', 'start-transaction'],
  
  parameters: [
    {
      name: 'name',
      description: '事务名称',
      type: 'string',
      required: true,
      validation: {
        minLength: 1,
        maxLength: 100
      }
    },
    {
      name: 'description',
      description: '事务描述',
      type: 'string',
      required: false,
      validation: {
        maxLength: 500
      }
    }
  ],
  
  execute: async (context: ICommandContext): Promise<ICommandResult> => {
    const undoManager = context.env?.undoManager as IUndoManager;
    
    if (!undoManager) {
      return {
        success: false,
        error: '撤销管理器未初始化'
      };
    }
    
    const { name, description } = context.args;
    
    try {
      const transactionId = undoManager.beginTransaction(name, description);
      
      return {
        success: true,
        data: {
          message: `事务已开始: ${name}`,
          transactionId,
          name,
          description
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `无法开始事务: ${(error as Error).message}`
      };
    }
  }
};

/**
 * 提交事务命令
 * 
 * 提交一个活动事务的命令。将事务中的所有操作
 * 作为一个整体添加到撤销历史中。
 * 
 * @example
 * ```typescript
 * // 提交指定的事务
 * const result = await commandSystem.execute('undo:commit-transaction', {
 *   transactionId: 'tx-123'
 * });
 * ```
 * 
 * @public
 * @since 1.0.0
 */
export const commitTransactionCommand: ICommand = {
  name: 'undo:commit-transaction',
  description: '提交一个活动的撤销事务',
  category: 'undo',
  aliases: ['commit-tx', 'end-transaction'],
  
  parameters: [
    {
      name: 'transactionId',
      description: '要提交的事务ID',
      type: 'string',
      required: true
    }
  ],
  
  execute: async (context: ICommandContext): Promise<ICommandResult> => {
    const undoManager = context.env?.undoManager as IUndoManager;
    
    if (!undoManager) {
      return {
        success: false,
        error: '撤销管理器未初始化'
      };
    }
    
    const { transactionId } = context.args;
    
    try {
      undoManager.commitTransaction(transactionId);
      
      return {
        success: true,
        data: {
          message: `事务已提交: ${transactionId}`,
          transactionId
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `无法提交事务: ${(error as Error).message}`
      };
    }
  }
};

/**
 * 回滚事务命令
 * 
 * 回滚一个活动事务的命令。撤销事务中的所有操作
 * 并丢弃事务，操作不会出现在撤销历史中。
 * 
 * @example
 * ```typescript
 * // 回滚指定的事务
 * const result = await commandSystem.execute('undo:rollback-transaction', {
 *   transactionId: 'tx-123'
 * });
 * ```
 * 
 * @public
 * @since 1.0.0
 */
export const rollbackTransactionCommand: ICommand = {
  name: 'undo:rollback-transaction',
  description: '回滚一个活动的撤销事务',
  category: 'undo',
  aliases: ['rollback-tx', 'abort-transaction'],
  
  parameters: [
    {
      name: 'transactionId',
      description: '要回滚的事务ID',
      type: 'string',
      required: true
    }
  ],
  
  execute: async (context: ICommandContext): Promise<ICommandResult> => {
    const undoManager = context.env?.undoManager as IUndoManager;
    
    if (!undoManager) {
      return {
        success: false,
        error: '撤销管理器未初始化'
      };
    }
    
    const { transactionId } = context.args;
    
    try {
      undoManager.rollbackTransaction(transactionId);
      
      return {
        success: true,
        data: {
          message: `事务已回滚: ${transactionId}`,
          transactionId
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `无法回滚事务: ${(error as Error).message}`
      };
    }
  }
};

/**
 * 撤销状态查询命令
 * 
 * 查询撤销管理器当前状态的命令。提供详细的状态信息，
 * 包括历史记录数量、事务状态、配置信息等。
 * 
 * @example
 * ```typescript
 * // 查询撤销系统状态
 * const result = await commandSystem.execute('undo:status');
 * console.log('撤销状态:', result.data);
 * ```
 * 
 * @public
 * @since 1.0.0
 */
export const undoStatusCommand: ICommand = {
  name: 'undo:status',
  description: '查看撤销系统的当前状态',
  category: 'undo',
  aliases: ['status', 'undo-info'],
  
  parameters: [],
  
  execute: async (context: ICommandContext): Promise<ICommandResult> => {
    const undoManager = context.env?.undoManager as IUndoManager;
    
    if (!undoManager) {
      return {
        success: false,
        error: '撤销管理器未初始化'
      };
    }
    
    const undoHistory = undoManager.getUndoHistory();
    const redoHistory = undoManager.getRedoHistory();
    const currentTransaction = undoManager.getCurrentTransaction();
    
    return {
      success: true,
      data: {
        canUndo: undoManager.canUndo(),
        canRedo: undoManager.canRedo(),
        undoCount: undoHistory.length,
        redoCount: redoHistory.length,
        historyLimit: undoManager.getHistoryLimit(),
        currentTransaction: currentTransaction ? {
          id: currentTransaction.id,
          name: currentTransaction.name,
          description: currentTransaction.description,
          status: currentTransaction.status,
          commandCount: currentTransaction.snapshots.length,
          startTime: currentTransaction.startTime
        } : null,
        recentUndo: undoHistory.length > 0 ? {
          commandName: undoHistory[undoHistory.length - 1].commandName,
          timestamp: undoHistory[undoHistory.length - 1].timestamp
        } : null,
        recentRedo: redoHistory.length > 0 ? {
          commandName: redoHistory[redoHistory.length - 1].commandName,
          timestamp: redoHistory[redoHistory.length - 1].timestamp
        } : null
      }
    };
  }
};

/**
 * 撤销命令集合
 * 
 * 包含所有内置撤销命令的数组，便于批量注册和管理。
 * 
 * @example
 * ```typescript
 * // 批量注册所有撤销命令
 * undoCommands.forEach(command => {
 *   commandSystem.register(command);
 * });
 * ```
 * 
 * @public
 * @since 1.0.0
 */
export const undoCommands = [
  undoCommand,
  redoCommand,
  undoHistoryCommand,
  clearHistoryCommand,
  beginTransactionCommand,
  commitTransactionCommand,
  rollbackTransactionCommand,
  undoStatusCommand
];

/**
 * 撤销命令加载器类
 * 
 * 提供便捷的方法来注册撤销相关的命令到命令系统中。
 * 支持全量注册和选择性注册。
 * 
 * @example
 * ```typescript
 * // 注册所有撤销命令
 * UndoCommandLoader.registerAllCommands(commandSystem);
 * 
 * // 只注册基础命令
 * UndoCommandLoader.registerBasicCommands(commandSystem);
 * 
 * // 只注册事务命令
 * UndoCommandLoader.registerTransactionCommands(commandSystem);
 * ```
 * 
 * @public
 * @since 1.0.0
 */
export class UndoCommandLoader {
  /**
   * 注册所有撤销命令
   * 
   * 将所有内置的撤销命令注册到指定的命令系统中。
   * 
   * @param commandSystem - 要注册命令的命令系统实例
   * 
   * @example
   * ```typescript
   * UndoCommandLoader.registerAllCommands(commandSystem);
   * console.log('所有撤销命令已注册');
   * ```
   * 
   * @public
   * @static
   */
  static registerAllCommands(commandSystem: any): void {
    undoCommands.forEach(command => {
      commandSystem.register(command);
    });
  }

  /**
   * 注册基础撤销命令
   * 
   * 只注册基本的撤销和重做命令，不包括高级功能。
   * 
   * @param commandSystem - 要注册命令的命令系统实例
   * 
   * @example
   * ```typescript
   * UndoCommandLoader.registerBasicCommands(commandSystem);
   * console.log('基础撤销命令已注册');
   * ```
   * 
   * @public
   * @static
   */
  static registerBasicCommands(commandSystem: any): void {
    const basicCommands = [
      undoCommand,
      redoCommand,
      undoStatusCommand
    ];
    
    basicCommands.forEach(command => {
      commandSystem.register(command);
    });
  }

  /**
   * 注册历史管理命令
   * 
   * 注册与历史记录查看和管理相关的命令。
   * 
   * @param commandSystem - 要注册命令的命令系统实例
   * 
   * @example
   * ```typescript
   * UndoCommandLoader.registerHistoryCommands(commandSystem);
   * console.log('历史管理命令已注册');
   * ```
   * 
   * @public
   * @static
   */
  static registerHistoryCommands(commandSystem: any): void {
    const historyCommands = [
      undoHistoryCommand,
      clearHistoryCommand
    ];
    
    historyCommands.forEach(command => {
      commandSystem.register(command);
    });
  }

  /**
   * 注册事务相关命令
   * 
   * 注册与事务管理相关的命令，包括开始、提交和回滚事务。
   * 
   * @param commandSystem - 要注册命令的命令系统实例
   * 
   * @example
   * ```typescript
   * UndoCommandLoader.registerTransactionCommands(commandSystem);
   * console.log('事务管理命令已注册');
   * ```
   * 
   * @public
   * @static
   */
  static registerTransactionCommands(commandSystem: any): void {
    const transactionCommands = [
      beginTransactionCommand,
      commitTransactionCommand,
      rollbackTransactionCommand
    ];
    
    transactionCommands.forEach(command => {
      commandSystem.register(command);
    });
  }

  /**
   * 检查命令是否已注册
   * 
   * 检查指定的撤销命令是否已经在命令系统中注册。
   * 
   * @param commandSystem - 要检查的命令系统实例
   * @param commandName - 要检查的命令名称
   * @returns 如果命令已注册返回 true，否则返回 false
   * 
   * @example
   * ```typescript
   * const isRegistered = UndoCommandLoader.isCommandRegistered(commandSystem, 'undo');
   * if (!isRegistered) {
   *   console.log('撤销命令尚未注册');
   * }
   * ```
   * 
   * @public
   * @static
   */
  static isCommandRegistered(commandSystem: any, commandName: string): boolean {
    try {
      const command = commandSystem.getCommand(commandName);
      return command !== null && command !== undefined;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取所有撤销命令的名称列表
   * 
   * 返回所有内置撤销命令的名称数组。
   * 
   * @returns 撤销命令名称数组
   * 
   * @example
   * ```typescript
   * const commandNames = UndoCommandLoader.getCommandNames();
   * console.log('可用的撤销命令:', commandNames);
   * ```
   * 
   * @public
   * @static
   */
  static getCommandNames(): string[] {
    return undoCommands.map(command => command.name);
  }

  /**
   * 获取命令注册状态报告
   * 
   * 生成详细的命令注册状态报告，显示哪些命令已注册，哪些未注册。
   * 
   * @param commandSystem - 要检查的命令系统实例
   * @returns 包含注册状态信息的对象
   * 
   * @example
   * ```typescript
   * const report = UndoCommandLoader.getRegistrationReport(commandSystem);
   * console.log(`已注册: ${report.registered.length}, 未注册: ${report.unregistered.length}`);
   * ```
   * 
   * @public
   * @static
   */
  static getRegistrationReport(commandSystem: any): {
    registered: string[];
    unregistered: string[];
    total: number;
  } {
    const registered: string[] = [];
    const unregistered: string[] = [];
    
    undoCommands.forEach(command => {
      if (this.isCommandRegistered(commandSystem, command.name)) {
        registered.push(command.name);
      } else {
        unregistered.push(command.name);
      }
    });
    
    return {
      registered,
      unregistered,
      total: undoCommands.length
    };
  }
} 