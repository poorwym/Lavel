/**
 * 撤销系统内置命令
 */

import { ICommand, ICommandContext, ICommandResult } from '@lavel/command-system';
import { IUndoManager, IHistoryItem } from './types';

/**
 * 撤销命令
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
        enum: ['yes', 'YES']
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
    
    if (confirm.toLowerCase() !== 'yes') {
      return {
        success: false,
        error: '需要确认才能清空历史记录'
      };
    }
    
    const previousCount = undoManager.getUndoHistory().length + undoManager.getRedoHistory().length;
    undoManager.clear();
    
    return {
      success: true,
      data: {
        message: '撤销历史已清空',
        clearedCount: previousCount
      }
    };
  }
};

/**
 * 开始事务命令
 */
export const beginTransactionCommand: ICommand = {
  name: 'transaction:begin',
  description: '开始一个新事务',
  category: 'undo',
  aliases: ['tx-begin', 'transaction-start'],
  
  parameters: [
    {
      name: 'name',
      description: '事务名称',
      type: 'string',
      required: true,
      validation: {
        min: 1,
        max: 100
      }
    },
    {
      name: 'description',
      description: '事务描述',
      type: 'string',
      required: false,
      validation: {
        max: 500
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
          transactionId,
          name,
          description,
          message: `事务 "${name}" 已开始`
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '开始事务失败'
      };
    }
  }
};

/**
 * 提交事务命令
 */
export const commitTransactionCommand: ICommand = {
  name: 'transaction:commit',
  description: '提交当前事务',
  category: 'undo',
  aliases: ['tx-commit', 'transaction-end'],
  
  parameters: [
    {
      name: 'transactionId',
      description: '事务ID（可选，默认提交当前事务）',
      type: 'string',
      required: false
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
    const currentTransaction = undoManager.getCurrentTransaction();
    
    if (!currentTransaction) {
      return {
        success: false,
        error: '当前没有活动的事务'
      };
    }
    
    const targetId = transactionId || currentTransaction.id;
    
    try {
      undoManager.commitTransaction(targetId);
      
      return {
        success: true,
        data: {
          transactionId: targetId,
          name: currentTransaction.name,
          commandCount: currentTransaction.snapshots.length,
          message: `事务 "${currentTransaction.name}" 已提交`
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '提交事务失败'
      };
    }
  }
};

/**
 * 回滚事务命令
 */
export const rollbackTransactionCommand: ICommand = {
  name: 'transaction:rollback',
  description: '回滚当前事务',
  category: 'undo',
  aliases: ['tx-rollback', 'transaction-abort'],
  
  parameters: [
    {
      name: 'transactionId',
      description: '事务ID（可选，默认回滚当前事务）',
      type: 'string',
      required: false
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
    const currentTransaction = undoManager.getCurrentTransaction();
    
    if (!currentTransaction) {
      return {
        success: false,
        error: '当前没有活动的事务'
      };
    }
    
    const targetId = transactionId || currentTransaction.id;
    
    try {
      undoManager.rollbackTransaction(targetId);
      
      return {
        success: true,
        data: {
          transactionId: targetId,
          name: currentTransaction.name,
          commandCount: currentTransaction.snapshots.length,
          message: `事务 "${currentTransaction.name}" 已回滚`
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '回滚事务失败'
      };
    }
  }
};

/**
 * 撤销状态命令
 */
export const undoStatusCommand: ICommand = {
  name: 'undo:status',
  description: '查看撤销系统状态',
  category: 'undo',
  aliases: ['undo-status'],
  
  execute: async (context: ICommandContext): Promise<ICommandResult> => {
    const undoManager = context.env?.undoManager as IUndoManager;
    
    if (!undoManager) {
      return {
        success: false,
        error: '撤销管理器未初始化'
      };
    }
    
    const currentTransaction = undoManager.getCurrentTransaction();
    
    return {
      success: true,
      data: {
        canUndo: undoManager.canUndo(),
        canRedo: undoManager.canRedo(),
        undoCount: undoManager.getUndoHistory().length,
        redoCount: undoManager.getRedoHistory().length,
        historyLimit: undoManager.getHistoryLimit(),
        currentTransaction: currentTransaction ? {
          id: currentTransaction.id,
          name: currentTransaction.name,
          status: currentTransaction.status,
          commandCount: currentTransaction.snapshots.length
        } : null
      }
    };
  }
};

/**
 * 导出所有撤销命令
 */
export const undoCommands: ICommand[] = [
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
 * 命令加载器
 */
export class UndoCommandLoader {
  /**
   * 注册所有撤销命令到命令系统
   */
  static registerAllCommands(commandSystem: any): void {
    undoCommands.forEach(command => {
      commandSystem.register(command);
    });
  }
  
  /**
   * 注册基础撤销命令（不包括事务相关）
   */
  static registerBasicCommands(commandSystem: any): void {
    const basicCommands = [
      undoCommand,
      redoCommand,
      undoHistoryCommand,
      undoStatusCommand
    ];
    
    basicCommands.forEach(command => {
      commandSystem.register(command);
    });
  }
} 