/**
 * @fileoverview 撤销系统中间件集合
 * 
 * 提供与命令系统集成的中间件，实现自动撤销记录功能：
 * - 基础撤销中间件
 * - 事务感知中间件
 * - 历史限制中间件
 * - 撤销感知中间件
 * - 组合中间件创建器
 * 
 * @author alex
 * @since 1.0.0
 * @version 1.0.0
 * @public
 */

import { ICommandMiddleware, ICommand, ICommandContext, ICommandResult } from '@lavel/command-system';
import { IUndoManager, IUndoMiddlewareConfig, ICommandSnapshot, IUndoableCommand } from './types';

/**
 * 创建基础撤销中间件
 * 
 * 创建一个基础的撤销中间件，自动记录可撤销命令的执行。
 * 这是最核心的中间件，负责将命令执行结果转换为快照并记录。
 * 
 * @param config - 撤销中间件配置
 * @returns 配置好的撤销中间件
 * 
 * @example
 * ```typescript
 * const undoManager = createUndoManager();
 * const middleware = createUndoMiddleware({
 *   undoManager,
 *   autoRecord: true,
 *   filter: (command) => command.undoable !== false,
 *   transformSnapshot: (snapshot) => {
 *     // 清理敏感信息
 *     const cleaned = { ...snapshot };
 *     if (cleaned.context.args.password) {
 *       cleaned.context.args.password = '[REDACTED]';
 *     }
 *     return cleaned;
 *   }
 * });
 * 
 * commandSystem.use(middleware);
 * ```
 * 
 * @public
 * @since 1.0.0
 */
export function createUndoMiddleware(config: IUndoMiddlewareConfig): ICommandMiddleware {
  return {
    name: 'undo-middleware',
    description: '自动记录可撤销命令的执行',
    priority: 100,
    
    async execute(command: ICommand, context: ICommandContext, next: () => Promise<ICommandResult>): Promise<ICommandResult> {
      // 检查是否应该记录这个命令
      if (!config.autoRecord) {
        return next();
      }
      
      // 应用过滤器
      if (config.filter && !config.filter(command, context)) {
        return next();
      }
      
      // 检查命令是否可撤销
      const undoableCommand = command as IUndoableCommand;
      if (!undoableCommand.undoable) {
        return next();
      }
      
      // 执行命令
      const result = await next();
      
      // 如果命令执行成功，记录快照
      if (result.success) {
        const snapshot: ICommandSnapshot = {
          id: generateSnapshotId(),
          commandName: command.name,
          context: {
            ...context,
            // 创建参数的深拷贝以避免引用问题
            args: JSON.parse(JSON.stringify(context.args))
          },
          result,
          timestamp: Date.now(),
          command: undoableCommand,
          previousState: context.env?.previousState,
          currentState: context.env?.currentState,
          metadata: {
            category: command.category,
            description: command.description,
            executionTime: Date.now() - (context.env?.startTime || Date.now())
          }
        };
        
        // 应用快照转换器
        const finalSnapshot = config.transformSnapshot ? 
          config.transformSnapshot(snapshot) : snapshot;
        
        // 记录快照到撤销管理器
        config.undoManager.record(finalSnapshot);
      }
      
      return result;
    }
  };
}

/**
 * 创建事务感知中间件
 * 
 * 创建一个能够感知和管理事务的中间件。当检测到事务相关的命令时，
 * 会自动处理事务的生命周期，包括开始、提交和回滚。
 * 
 * @param undoManager - 撤销管理器实例
 * @returns 事务感知中间件
 * 
 * @example
 * ```typescript
 * const middleware = createTransactionMiddleware(undoManager);
 * commandSystem.use(middleware);
 * 
 * // 现在事务命令会被自动处理
 * await commandSystem.execute('undo:begin-transaction', { name: 'batchOp' });
 * await commandSystem.execute('someCommand', { args: 'value' });
 * await commandSystem.execute('undo:commit-transaction', { transactionId: 'tx-id' });
 * ```
 * 
 * @public
 * @since 1.0.0
 */
export function createTransactionMiddleware(undoManager: IUndoManager): ICommandMiddleware {
  return {
    name: 'transaction-middleware',
    description: '自动处理事务生命周期',
    priority: 90,
    
    async execute(command: ICommand, context: ICommandContext, next: () => Promise<ICommandResult>): Promise<ICommandResult> {
      // 为撤销相关命令设置撤销管理器
      if (command.category === 'undo' || command.name.startsWith('undo:')) {
        context.env = context.env || {};
        context.env.undoManager = undoManager;
      }
      
      // 为事务命令添加特殊处理
      switch (command.name) {
        case 'undo:begin-transaction':
        case 'begin-tx':
        case 'start-transaction':
          // 在开始事务前，记录开始时间
          context.env = context.env || {};
          context.env.transactionStartTime = Date.now();
          break;
          
        case 'undo:commit-transaction':
        case 'commit-tx':
        case 'end-transaction':
          // 在提交事务时，记录事务完成信息
          const currentTx = undoManager.getCurrentTransaction();
          if (currentTx) {
            context.env = context.env || {};
            context.env.transactionInfo = {
              id: currentTx.id,
              name: currentTx.name,
              commandCount: currentTx.snapshots.length,
              duration: Date.now() - currentTx.startTime
            };
          }
          break;
          
        case 'undo:rollback-transaction':
        case 'rollback-tx':
        case 'abort-transaction':
          // 在回滚事务时，记录回滚原因
          context.env = context.env || {};
          context.env.rollbackReason = context.args.reason || 'Manual rollback';
          break;
      }
      
      return next();
    }
  };
}

/**
 * 创建历史限制中间件
 * 
 * 创建一个监控和管理历史记录大小的中间件。当历史记录
 * 接近限制时，会发出警告；超出限制时会自动清理旧记录。
 * 
 * @param undoManager - 撤销管理器实例
 * @param options - 历史限制配置选项
 * @returns 历史限制中间件
 * 
 * @example
 * ```typescript
 * const middleware = createHistoryLimitMiddleware(undoManager, {
 *   warningThreshold: 0.8,
 *   onWarning: (count, limit) => {
 *     console.warn(`撤销历史接近上限: ${count}/${limit}`);
 *   },
 *   onLimitExceeded: (count, limit) => {
 *     console.log(`撤销历史已达上限，清理旧记录: ${count}/${limit}`);
 *   }
 * });
 * 
 * commandSystem.use(middleware);
 * ```
 * 
 * @public
 * @since 1.0.0
 */
export function createHistoryLimitMiddleware(
  undoManager: IUndoManager,
  options: {
    /** 警告阈值（0-1），当历史记录达到此比例时发出警告 */
    warningThreshold?: number;
    /** 警告回调函数 */
    onWarning?: (currentCount: number, limit: number) => void;
    /** 超出限制回调函数 */
    onLimitExceeded?: (currentCount: number, limit: number) => void;
  } = {}
): ICommandMiddleware {
  const config = {
    warningThreshold: 0.8,
    ...options
  };
  
  return {
    name: 'history-limit-middleware',
    description: '监控和管理撤销历史大小',
    priority: 80,
    
    async execute(command: ICommand, context: ICommandContext, next: () => Promise<ICommandResult>): Promise<ICommandResult> {
      const result = await next();
      
      // 只在成功执行可撤销命令后检查
      if (result.success && (command as IUndoableCommand).undoable) {
        const currentCount = undoManager.getUndoHistory().length;
        const limit = undoManager.getHistoryLimit();
        const threshold = Math.floor(limit * config.warningThreshold);
        
        // 检查是否达到警告阈值
        if (currentCount >= threshold && currentCount < limit && config.onWarning) {
          config.onWarning(currentCount, limit);
        }
        
        // 检查是否超出限制
        if (currentCount >= limit && config.onLimitExceeded) {
          config.onLimitExceeded(currentCount, limit);
        }
      }
      
      return result;
    }
  };
}

/**
 * 创建撤销感知中间件
 * 
 * 创建一个能够感知撤销操作的中间件，为命令上下文提供
 * 撤销相关的信息和方法，增强命令的撤销感知能力。
 * 
 * @param undoManager - 撤销管理器实例
 * @returns 撤销感知中间件
 * 
 * @example
 * ```typescript
 * const middleware = createUndoAwareMiddleware(undoManager);
 * commandSystem.use(middleware);
 * 
 * // 现在命令可以访问撤销信息
 * const command = {
 *   name: 'smartEdit',
 *   execute: async (context) => {
 *     // 检查是否可以撤销
 *     if (context.env.undo.canUndo()) {
 *       console.log('有可撤销的操作');
 *     }
 *     
 *     // 获取最近的操作
 *     const recentOp = context.env.undo.getLastOperation();
 *     if (recentOp) {
 *       console.log('最近操作:', recentOp.commandName);
 *     }
 *     
 *     return { success: true };
 *   }
 * };
 * ```
 * 
 * @public
 * @since 1.0.0
 */
export function createUndoAwareMiddleware(undoManager: IUndoManager): ICommandMiddleware {
  return {
    name: 'undo-aware-middleware',
    description: '为命令提供撤销感知能力',
    priority: 70,
    
    async execute(command: ICommand, context: ICommandContext, next: () => Promise<ICommandResult>): Promise<ICommandResult> {
      // 在上下文中注入撤销相关的方法和信息
      context.env = context.env || {};
      context.env.undo = {
        /**
         * 检查是否可以撤销
         * @returns 是否可以撤销
         */
        canUndo: () => undoManager.canUndo(),
        
        /**
         * 检查是否可以重做
         * @returns 是否可以重做
         */
        canRedo: () => undoManager.canRedo(),
        
        /**
         * 获取撤销历史数量
         * @returns 撤销历史数量
         */
        getUndoCount: () => undoManager.getUndoHistory().length,
        
        /**
         * 获取重做历史数量
         * @returns 重做历史数量
         */
        getRedoCount: () => undoManager.getRedoHistory().length,
        
        /**
         * 获取最近的操作
         * @returns 最近的快照或null
         */
        getLastOperation: () => {
          const history = undoManager.getUndoHistory();
          return history.length > 0 ? history[history.length - 1] : null;
        },
        
        /**
         * 获取当前活动的事务
         * @returns 当前事务或null
         */
        getCurrentTransaction: () => undoManager.getCurrentTransaction(),
        
        /**
         * 检查是否在事务中
         * @returns 是否在事务中
         */
        isInTransaction: () => undoManager.getCurrentTransaction() !== null,
        
        /**
         * 获取历史记录限制
         * @returns 历史记录限制
         */
        getHistoryLimit: () => undoManager.getHistoryLimit()
      };
      
      return next();
    }
  };
}

/**
 * 创建性能监控中间件
 * 
 * 创建一个监控命令执行性能的中间件，记录执行时间
 * 并在快照中包含性能信息。
 * 
 * @param options - 性能监控配置选项
 * @returns 性能监控中间件
 * 
 * @example
 * ```typescript
 * const middleware = createPerformanceMiddleware({
 *   slowCommandThreshold: 1000,
 *   onSlowCommand: (command, duration) => {
 *     console.warn(`慢命令检测: ${command.name} 耗时 ${duration}ms`);
 *   }
 * });
 * 
 * commandSystem.use(middleware);
 * ```
 * 
 * @public
 * @since 1.0.0
 */
export function createPerformanceMiddleware(options: {
  /** 慢命令阈值（毫秒） */
  slowCommandThreshold?: number;
  /** 慢命令回调 */
  onSlowCommand?: (command: ICommand, duration: number) => void;
} = {}): ICommandMiddleware {
  const config = {
    slowCommandThreshold: 1000,
    ...options
  };
  
  return {
    name: 'performance-middleware',
    description: '监控命令执行性能',
    priority: 60,
    
    async execute(command: ICommand, context: ICommandContext, next: () => Promise<ICommandResult>): Promise<ICommandResult> {
      const startTime = Date.now();
      
      // 在环境中记录开始时间
      context.env = context.env || {};
      context.env.startTime = startTime;
      
      const result = await next();
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // 记录性能信息
      context.env.performanceInfo = {
        duration,
        startTime,
        endTime,
        isSlow: duration > config.slowCommandThreshold
      };
      
      // 检查是否为慢命令
      if (duration > config.slowCommandThreshold && config.onSlowCommand) {
        config.onSlowCommand(command, duration);
      }
      
      return result;
    }
  };
}

/**
 * 创建错误恢复中间件
 * 
 * 创建一个处理命令执行错误的中间件，在命令失败时
 * 自动进行清理和恢复操作。
 * 
 * @param undoManager - 撤销管理器实例
 * @param options - 错误恢复配置选项
 * @returns 错误恢复中间件
 * 
 * @example
 * ```typescript
 * const middleware = createErrorRecoveryMiddleware(undoManager, {
 *   autoRollbackOnError: true,
 *   onError: (error, command, context) => {
 *     console.error('命令执行失败:', command.name, error.message);
 *   },
 *   shouldRollback: (error, command) => {
 *     // 只对特定类型的错误进行回滚
 *     return error.name === 'ValidationError';
 *   }
 * });
 * 
 * commandSystem.use(middleware);
 * ```
 * 
 * @public
 * @since 1.0.0
 */
export function createErrorRecoveryMiddleware(
  undoManager: IUndoManager,
  options: {
    /** 是否在错误时自动回滚当前事务 */
    autoRollbackOnError?: boolean;
    /** 错误处理回调 */
    onError?: (error: Error, command: ICommand, context: ICommandContext) => void;
    /** 判断是否应该回滚的函数 */
    shouldRollback?: (error: Error, command: ICommand) => boolean;
  } = {}
): ICommandMiddleware {
  return {
    name: 'error-recovery-middleware',
    description: '处理命令执行错误和自动恢复',
    priority: 50,
    
    async execute(command: ICommand, context: ICommandContext, next: () => Promise<ICommandResult>): Promise<ICommandResult> {
      try {
        return await next();
      } catch (error) {
        const err = error as Error;
        
        // 调用错误处理回调
        if (options.onError) {
          options.onError(err, command, context);
        }
        
        // 检查是否需要回滚当前事务
        if (options.autoRollbackOnError) {
          const currentTransaction = undoManager.getCurrentTransaction();
          if (currentTransaction) {
            const shouldRollback = options.shouldRollback ? 
              options.shouldRollback(err, command) : true;
            
            if (shouldRollback) {
              try {
                undoManager.rollbackTransaction(currentTransaction.id);
                console.log(`自动回滚事务: ${currentTransaction.name}`);
              } catch (rollbackError) {
                console.error('自动回滚失败:', rollbackError);
              }
            }
          }
        }
        
        // 重新抛出错误
        throw error;
      }
    }
  };
}

/**
 * 创建组合撤销中间件
 * 
 * 创建一个包含多个撤销相关中间件的组合，提供完整的
 * 撤销功能支持。这是推荐的集成方式。
 * 
 * @param undoManager - 撤销管理器实例
 * @param config - 可选的配置选项
 * @returns 中间件数组
 * 
 * @example
 * ```typescript
 * const middlewares = createCombinedUndoMiddleware(undoManager, {
 *   autoRecord: true,
 *   filter: (command) => command.undoable !== false,
 *   enablePerformanceMonitoring: true,
 *   enableErrorRecovery: true,
 *   historyLimitWarning: true
 * });
 * 
 * // 批量应用所有中间件
 * middlewares.forEach(middleware => {
 *   commandSystem.use(middleware);
 * });
 * ```
 * 
 * @public
 * @since 1.0.0
 */
export function createCombinedUndoMiddleware(
  undoManager: IUndoManager,
  config?: {
    /** 是否自动记录命令 */
    autoRecord?: boolean;
    /** 命令过滤器 */
    filter?: (command: ICommand, context: ICommandContext) => boolean;
    /** 快照转换器 */
    transformSnapshot?: (snapshot: ICommandSnapshot) => ICommandSnapshot;
    /** 是否启用性能监控 */
    enablePerformanceMonitoring?: boolean;
    /** 是否启用错误恢复 */
    enableErrorRecovery?: boolean;
    /** 是否启用历史限制警告 */
    enableHistoryLimitWarning?: boolean;
    /** 慢命令阈值（毫秒） */
    slowCommandThreshold?: number;
    /** 历史限制警告阈值 */
    historyWarningThreshold?: number;
  }
): ICommandMiddleware[] {
  const middlewares: ICommandMiddleware[] = [];
  
  // 基础撤销中间件（必需）
  middlewares.push(createUndoMiddleware({
    undoManager,
    autoRecord: config?.autoRecord ?? true,
    filter: config?.filter,
    transformSnapshot: config?.transformSnapshot
  }));
  
  // 事务感知中间件
  middlewares.push(createTransactionMiddleware(undoManager));
  
  // 撤销感知中间件
  middlewares.push(createUndoAwareMiddleware(undoManager));
  
  // 可选的性能监控中间件
  if (config?.enablePerformanceMonitoring) {
    middlewares.push(createPerformanceMiddleware({
      slowCommandThreshold: config.slowCommandThreshold
    }));
  }
  
  // 可选的历史限制监控中间件
  if (config?.enableHistoryLimitWarning) {
    middlewares.push(createHistoryLimitMiddleware(undoManager, {
      warningThreshold: config.historyWarningThreshold
    }));
  }
  
  // 可选的错误恢复中间件
  if (config?.enableErrorRecovery) {
    middlewares.push(createErrorRecoveryMiddleware(undoManager, {
      autoRollbackOnError: true
    }));
  }
  
  return middlewares;
}

/**
 * 生成快照ID的工具函数
 * 
 * 生成一个唯一的快照标识符。
 * 
 * @returns 唯一的快照ID
 * 
 * @internal
 */
function generateSnapshotId(): string {
  return `snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
} 