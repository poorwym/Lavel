/**
 * 撤销系统中间件
 */

import { 
  ICommandMiddleware, 
  ICommandContext, 
  ICommandResult,
  ICommand 
} from '@lavel/command-system';
import { 
  IUndoMiddlewareConfig, 
  ICommandSnapshot,
  IUndoableCommand,
  IUndoManager
} from './types';

/**
 * 创建撤销中间件
 * 自动捕获可撤销命令的执行并记录到撤销管理器
 */
export function createUndoMiddleware(config: IUndoMiddlewareConfig): ICommandMiddleware {
  const { 
    undoManager, 
    autoRecord = true, 
    filter, 
    transformSnapshot 
  } = config;

  // 用于存储命令执行前的状态
  const contextMap = new WeakMap<ICommandContext, { 
    command: ICommand;
    startTime: number;
  }>();

  return {
    name: 'undo-middleware',
    order: -500, // 在大多数中间件之前执行

    before: async (context: ICommandContext) => {
      // 从上下文中获取命令
      const command = context.env?.currentCommand as ICommand;
      
      if (!command) {
        return context;
      }

      // 检查是否应该记录此命令
      if (!autoRecord) {
        return context;
      }

      // 应用过滤器
      if (filter && !filter(command, context)) {
        return context;
      }

      // 检查是否是可撤销命令
      const undoableCommand = command as IUndoableCommand;
      if (undoableCommand.undoable === false) {
        return context;
      }

      // 存储命令和开始时间（不存储 previousState，因为此时还没有）
      contextMap.set(context, {
        command,
        startTime: Date.now()
      });

      return context;
    },

    after: async (context: ICommandContext, result: ICommandResult) => {
      const info = contextMap.get(context);
      
      if (!info || !result.success) {
        return result;
      }

      const { command, startTime } = info;
      const undoableCommand = command as IUndoableCommand;

      // 如果命令不可撤销，直接返回
      if (undoableCommand.undoable === false || (!undoableCommand.undo && !isSystemUndoCommand(command))) {
        return result;
      }

      // 从执行后的上下文中获取 previousState
      const previousState = context.env?.previousState;

      // 创建命令快照
      let snapshot: ICommandSnapshot = {
        id: generateSnapshotId(),
        commandName: command.name,
        context: cloneContext(context),
        result: cloneResult(result),
        timestamp: startTime,
        command: undoableCommand,
        previousState,
        currentState: context.env?.currentState,
        metadata: {
          category: command.category,
          description: command.description,
          executionTime: result.executionTime
        }
      };

      // 应用快照转换器
      if (transformSnapshot) {
        snapshot = transformSnapshot(snapshot);
      }

      // 记录到撤销管理器
      undoManager.record(snapshot);

      // 清理
      contextMap.delete(context);

      return result;
    },

    onError: async (context: ICommandContext, error: Error) => {
      // 出错时清理
      contextMap.delete(context);
      
      return {
        success: false,
        error: error.message
      };
    }
  };
}

/**
 * 创建事务中间件
 * 用于支持事务性的命令执行
 */
export function createTransactionMiddleware(undoManager: IUndoManager): ICommandMiddleware {
  return {
    name: 'transaction-middleware',
    order: -600, // 在撤销中间件之前执行

    before: async (context: ICommandContext) => {
      // 检查是否需要开启事务
      const transactionConfig = context.env?.transaction;
      
      if (transactionConfig && !undoManager.getCurrentTransaction()) {
        const { name, description } = transactionConfig;
        const transactionId = undoManager.beginTransaction(name, description);
        
        // 将事务ID存储在上下文中
        context.env.transactionId = transactionId;
      }

      return context;
    },

    after: async (context: ICommandContext, result: ICommandResult) => {
      // 检查是否需要提交事务
      const transactionId = context.env?.transactionId;
      const autoCommit = context.env?.transaction?.autoCommit !== false;
      
      if (transactionId && autoCommit && result.success) {
        const currentTransaction = undoManager.getCurrentTransaction();
        if (currentTransaction?.id === transactionId) {
          undoManager.commitTransaction(transactionId);
        }
      }

      return result;
    },

    onError: async (context: ICommandContext, error: Error) => {
      // 出错时回滚事务
      const transactionId = context.env?.transactionId;
      
      if (transactionId) {
        const currentTransaction = undoManager.getCurrentTransaction();
        if (currentTransaction?.id === transactionId) {
          undoManager.rollbackTransaction(transactionId);
        }
      }

      return {
        success: false,
        error: error.message
      };
    }
  };
}

/**
 * 创建历史限制中间件
 * 用于在特定条件下限制历史记录
 */
export function createHistoryLimitMiddleware(options: {
  shouldLimit: (context: ICommandContext) => boolean;
  temporaryLimit: number;
}): ICommandMiddleware {
  let originalLimit: number | null = null;
  
  return {
    name: 'history-limit-middleware',
    order: -700,

    before: async (context: ICommandContext) => {
      if (options.shouldLimit(context)) {
        const undoManager = context.env?.undoManager as IUndoManager;
        if (undoManager) {
          originalLimit = undoManager.getHistoryLimit();
          undoManager.setHistoryLimit(options.temporaryLimit);
        }
      }
      return context;
    },

    after: async (context: ICommandContext, result: ICommandResult) => {
      if (originalLimit !== null) {
        const undoManager = context.env?.undoManager as IUndoManager;
        if (undoManager) {
          undoManager.setHistoryLimit(originalLimit);
          originalLimit = null;
        }
      }
      return result;
    }
  };
}

/**
 * 生成快照ID
 */
function generateSnapshotId(): string {
  return `snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 深度克隆上下文
 */
function cloneContext(context: ICommandContext): ICommandContext {
  return {
    args: { ...context.args },
    env: { ...context.env },
    user: context.user ? { ...context.user } : undefined,
    session: context.session ? { ...context.session } : undefined
  };
}

/**
 * 深度克隆结果
 */
function cloneResult(result: ICommandResult): ICommandResult {
  return {
    success: result.success,
    data: result.data ? JSON.parse(JSON.stringify(result.data)) : undefined,
    error: result.error,
    executionTime: result.executionTime,
    metadata: result.metadata ? { ...result.metadata } : undefined
  };
}

/**
 * 检查是否是系统撤销命令
 */
function isSystemUndoCommand(command: ICommand): boolean {
  return ['undo', 'redo', 'undo:many', 'redo:many'].includes(command.name);
}

/**
 * 创建撤销感知中间件
 * 为命令添加撤销相关的上下文信息
 */
export function createUndoAwareMiddleware(undoManager: IUndoManager): ICommandMiddleware {
  return {
    name: 'undo-aware-middleware',
    order: -800,

    before: async (context: ICommandContext) => {
      // 将撤销管理器添加到环境中
      context.env.undoManager = undoManager;
      
      // 添加撤销状态信息
      context.env.undoState = {
        canUndo: undoManager.canUndo(),
        canRedo: undoManager.canRedo(),
        undoCount: undoManager.getUndoHistory().length,
        redoCount: undoManager.getRedoHistory().length
      };

      return context;
    }
  };
}

/**
 * 创建组合撤销中间件
 * 将所有撤销相关的中间件组合在一起
 */
export function createCombinedUndoMiddleware(
  undoManager: IUndoManager,
  config?: Partial<IUndoMiddlewareConfig>
): ICommandMiddleware[] {
  const undoConfig: IUndoMiddlewareConfig = {
    undoManager,
    autoRecord: true,
    ...config
  };

  return [
    createUndoAwareMiddleware(undoManager),
    createTransactionMiddleware(undoManager),
    createUndoMiddleware(undoConfig)
  ];
} 