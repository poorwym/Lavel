/**
 * @fileoverview 撤销管理器核心实现
 * 
 * 提供撤销/重做功能的核心实现，包括：
 * - 撤销管理器类
 * - 事件发射器实现
 * - 命令快照管理
 * - 事务处理逻辑
 * - 历史记录管理
 * 
 * @author alex
 * @since 1.0.0
 * @version 1.0.0
 * @public
 */


import {
  IUndoManager,
  IUndoManagerConfig,
  ICommandSnapshot,
  ITransaction,
  IUndoEventEmitter,
  IUndoEvent,
  UndoEventType,
  UndoEventListener,
  IUndoableCommand
} from './types';

/**
 * 撤销事件发射器实现类
 * 
 * 实现标准的发布-订阅模式，为撤销管理器提供事件通知功能。
 * 支持多种事件类型和多个监听器的管理。
 * 
 * @example
 * ```typescript
 * const emitter = new UndoEventEmitter();
 * 
 * // 添加监听器
 * emitter.on('undo.executed', (event) => {
 *   console.log('撤销执行:', event.snapshot?.commandName);
 * });
 * 
 * // 触发事件
 * emitter.emit({
 *   type: 'undo.executed',
 *   timestamp: Date.now(),
 *   snapshot: commandSnapshot
 * });
 * ```
 * 
 * @internal
 * @since 1.0.0
 */
class UndoEventEmitter implements IUndoEventEmitter {
  /** 事件监听器映射表 */
  private listeners: Map<UndoEventType, UndoEventListener[]> = new Map();

  /**
   * 添加事件监听器
   * 
   * @param eventType - 事件类型
   * @param listener - 监听器函数
   * 
   * @public
   */
  on(eventType: UndoEventType, listener: UndoEventListener): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)?.push(listener);
  }

  /**
   * 移除事件监听器
   * 
   * @param eventType - 事件类型
   * @param listener - 要移除的监听器函数
   * 
   * @public
   */
  off(eventType: UndoEventType, listener: UndoEventListener): void {
    const eventListeners = this.listeners.get(eventType);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  /**
   * 触发事件
   * 
   * @param event - 要触发的事件对象
   * 
   * @public
   */
  emit(event: IUndoEvent): void {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error(`撤销事件监听器执行失败:`, error);
        }
      });
    }
  }
}

/**
 * 撤销管理器实现类
 * 
 * 撤销系统的核心组件，负责管理命令历史、执行撤销重做操作、
 * 处理事务以及触发相关事件。提供完整的撤销/重做功能。
 * 
 * @example
 * ```typescript
 * const undoManager = new UndoManager({
 *   historyLimit: 100,
 *   debug: true,
 *   enableTransactions: true
 * });
 * 
 * // 记录命令执行
 * undoManager.record(snapshot);
 * 
 * // 执行撤销
 * const success = await undoManager.undo();
 * 
 * // 使用事务
 * const txId = undoManager.beginTransaction('batchOperation');
 * // ... 执行多个命令
 * undoManager.commitTransaction(txId);
 * ```
 * 
 * @public
 * @since 1.0.0
 */
export class UndoManager implements IUndoManager {
  /** 撤销栈，存储可撤销的命令快照 */
  private undoStack: ICommandSnapshot[] = [];
  
  /** 重做栈，存储可重做的命令快照 */
  private redoStack: ICommandSnapshot[] = [];
  
  /** 事务映射表，管理所有活动的事务 */
  private transactions: Map<string, ITransaction> = new Map();
  
  /** 当前活动的事务 */
  private currentTransaction: ITransaction | null = null;
  
  /** 撤销管理器配置 */
  private config: Required<IUndoManagerConfig>;
  
  /** 事件发射器，用于发布撤销相关事件 */
  private eventEmitter: IUndoEventEmitter;

  /**
   * 创建撤销管理器实例
   * 
   * @param config - 撤销管理器配置选项
   * 
   * @example
   * ```typescript
   * const undoManager = new UndoManager({
   *   historyLimit: 50,
   *   debug: true,
   *   onUndoError: (error, snapshot) => {
   *     console.error('撤销失败:', error.message);
   *     logger.error('Undo failed', { command: snapshot.commandName, error });
   *   }
   * });
   * ```
   */
  constructor(config: IUndoManagerConfig = {}) {
    this.config = {
      historyLimit: 100,
      debug: false,
      enableTransactions: true,
      autoCleanupTransactions: true,
      transactionTimeout: 60000,
      onUndoError: (error, snapshot) => {
        console.error(`撤销失败 [${snapshot.commandName}]:`, error);
      },
      onRedoError: (error, snapshot) => {
        console.error(`重做失败 [${snapshot.commandName}]:`, error);
      },
      ...config
    };

    this.eventEmitter = new UndoEventEmitter();
  }

  /**
   * 记录命令执行快照
   * 
   * 将命令快照添加到撤销历史中。如果当前有活动事务，
   * 快照会被添加到事务中；否则直接添加到撤销栈。
   * 
   * @param snapshot - 要记录的命令快照
   * 
   * @example
   * ```typescript
   * const snapshot: ICommandSnapshot = {
   *   id: 'snap-001',
   *   commandName: 'deleteFile',
   *   context: { args: { filename: 'test.txt' } },
   *   result: { success: true },
   *   timestamp: Date.now(),
   *   previousState: { fileContent: 'original content' }
   * };
   * 
   * undoManager.record(snapshot);
   * ```
   * 
   * @public
   */
  record(snapshot: ICommandSnapshot): void {
    // 如果在事务中，添加到事务
    if (this.currentTransaction) {
      this.currentTransaction.snapshots.push(snapshot);
      this.log(`记录到事务 [${this.currentTransaction.name}]: ${snapshot.commandName}`);
      return;
    }

    // 添加到撤销栈
    this.undoStack.push(snapshot);
    
    // 清空重做栈（新操作会使重做历史失效）
    this.redoStack = [];
    
    // 限制历史大小
    if (this.undoStack.length > this.config.historyLimit) {
      const removed = this.undoStack.shift();
      this.log(`历史记录达到上限，移除最旧的记录: ${removed?.commandName}`);
    }

    this.log(`记录命令: ${snapshot.commandName}`);
    
    // 触发事件
    this.eventEmitter.emit({
      type: 'snapshot.recorded',
      timestamp: Date.now(),
      snapshot
    });
  }

  /**
   * 执行撤销操作
   * 
   * 撤销最近的一个操作（命令或事务）。会调用命令的 undo 方法
   * 或按逆序撤销事务中的所有命令。
   * 
   * @returns Promise 解析为撤销是否成功
   * 
   * @example
   * ```typescript
   * const success = await undoManager.undo();
   * if (success) {
   *   console.log('撤销成功');
   *   updateUI();
   * } else {
   *   console.log('撤销失败或没有可撤销的操作');
   * }
   * ```
   * 
   * @throws 撤销过程中的错误会被捕获并触发错误处理器
   * @public
   */
  async undo(): Promise<boolean> {
    if (!this.canUndo()) {
      this.log('没有可撤销的操作');
      return false;
    }

    const snapshot = this.undoStack.pop()!;
    
    try {
      // 检查是否是事务
      const transaction = this.findTransactionBySnapshot(snapshot);
      if (transaction) {
        return await this.undoTransaction(transaction);
      }

      // 执行单个命令的撤销
      const result = await this.undoSnapshot(snapshot);
      
      if (result) {
        // 添加到重做栈
        this.redoStack.push(snapshot);
        
        // 触发成功事件
        this.eventEmitter.emit({
          type: 'undo.executed',
          timestamp: Date.now(),
          snapshot
        });
        
        this.log(`撤销成功: ${snapshot.commandName}`);
        return true;
      } else {
        // 撤销失败，恢复到撤销栈
        this.undoStack.push(snapshot);
        return false;
      }
    } catch (error) {
      // 撤销失败，恢复到撤销栈
      this.undoStack.push(snapshot);
      
      // 触发失败事件
      this.eventEmitter.emit({
        type: 'undo.failed',
        timestamp: Date.now(),
        snapshot,
        error: error as Error
      });
      
      // 调用错误处理器
      this.config.onUndoError(error as Error, snapshot);
      
      return false;
    }
  }

  /**
   * 执行重做操作
   * 
   * 重做最近被撤销的操作。会调用命令的 redo 方法（如果存在）
   * 或重新执行原始命令。
   * 
   * @returns Promise 解析为重做是否成功
   * 
   * @example
   * ```typescript
   * const success = await undoManager.redo();
   * if (success) {
   *   console.log('重做成功');
   *   updateUI();
   * } else {
   *   console.log('重做失败或没有可重做的操作');
   * }
   * ```
   * 
   * @throws 重做过程中的错误会被捕获并触发错误处理器
   * @public
   */
  async redo(): Promise<boolean> {
    if (!this.canRedo()) {
      this.log('没有可重做的操作');
      return false;
    }

    const snapshot = this.redoStack.pop()!;
    
    try {
      // 检查是否是事务
      const transaction = this.findTransactionBySnapshot(snapshot);
      if (transaction) {
        return await this.redoTransaction(transaction);
      }

      // 执行单个命令的重做
      const result = await this.redoSnapshot(snapshot);
      
      if (result) {
        // 添加到撤销栈
        this.undoStack.push(snapshot);
        
        // 触发成功事件
        this.eventEmitter.emit({
          type: 'redo.executed',
          timestamp: Date.now(),
          snapshot
        });
        
        this.log(`重做成功: ${snapshot.commandName}`);
        return true;
      } else {
        // 重做失败，恢复到重做栈
        this.redoStack.push(snapshot);
        return false;
      }
    } catch (error) {
      // 重做失败，恢复到重做栈
      this.redoStack.push(snapshot);
      
      // 触发失败事件
      this.eventEmitter.emit({
        type: 'redo.failed',
        timestamp: Date.now(),
        snapshot,
        error: error as Error
      });
      
      // 调用错误处理器
      this.config.onRedoError(error as Error, snapshot);
      
      return false;
    }
  }

  /**
   * 批量撤销多个操作
   * 
   * 连续执行指定数量的撤销操作。如果中间某个撤销失败，
   * 会停止执行并返回实际撤销的数量。
   * 
   * @param steps - 要撤销的步数，必须大于 0
   * @returns Promise 解析为实际撤销的步数
   * 
   * @example
   * ```typescript
   * // 尝试撤销最近的 5 个操作
   * const undoneCount = await undoManager.undoMany(5);
   * console.log(`成功撤销了 ${undoneCount} 个操作`);
   * 
   * if (undoneCount < 5) {
   *   console.log('部分撤销失败或历史记录不足');
   * }
   * ```
   * 
   * @public
   */
  async undoMany(steps: number): Promise<number> {
    let undoneCount = 0;
    
    for (let i = 0; i < steps && this.canUndo(); i++) {
      const success = await this.undo();
      if (success) {
        undoneCount++;
      } else {
        break;
      }
    }
    
    return undoneCount;
  }

  /**
   * 批量重做多个操作
   * 
   * 连续执行指定数量的重做操作。如果中间某个重做失败，
   * 会停止执行并返回实际重做的数量。
   * 
   * @param steps - 要重做的步数，必须大于 0
   * @returns Promise 解析为实际重做的步数
   * 
   * @example
   * ```typescript
   * // 尝试重做最近撤销的 3 个操作
   * const redoneCount = await undoManager.redoMany(3);
   * console.log(`成功重做了 ${redoneCount} 个操作`);
   * ```
   * 
   * @public
   */
  async redoMany(steps: number): Promise<number> {
    let redoneCount = 0;
    
    for (let i = 0; i < steps && this.canRedo(); i++) {
      const success = await this.redo();
      if (success) {
        redoneCount++;
      } else {
        break;
      }
    }
    
    return redoneCount;
  }

  /**
   * 检查是否可以执行撤销
   * 
   * @returns 如果有可撤销的操作返回 true，否则返回 false
   * 
   * @example
   * ```typescript
   * if (undoManager.canUndo()) {
   *   undoButton.disabled = false;
   * } else {
   *   undoButton.disabled = true;
   * }
   * ```
   * 
   * @public
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * 检查是否可以执行重做
   * 
   * @returns 如果有可重做的操作返回 true，否则返回 false
   * 
   * @example
   * ```typescript
   * if (undoManager.canRedo()) {
   *   redoButton.disabled = false;
   * } else {
   *   redoButton.disabled = true;
   * }
   * ```
   * 
   * @public
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * 获取撤销历史记录
   * 
   * 返回所有可撤销的命令快照，按执行时间顺序排列（最新的在后面）。
   * 
   * @returns 撤销历史快照数组的只读副本
   * 
   * @example
   * ```typescript
   * const history = undoManager.getUndoHistory();
   * console.log(`撤销历史包含 ${history.length} 个操作:`);
   * history.forEach((snapshot, index) => {
   *   console.log(`${index + 1}. ${snapshot.commandName} (${new Date(snapshot.timestamp)})`);
   * });
   * ```
   * 
   * @public
   */
  getUndoHistory(): ICommandSnapshot[] {
    return [...this.undoStack];
  }

  /**
   * 获取重做历史记录
   * 
   * 返回所有可重做的命令快照，按撤销时间的逆序排列。
   * 
   * @returns 重做历史快照数组的只读副本
   * 
   * @example
   * ```typescript
   * const redoHistory = undoManager.getRedoHistory();
   * console.log(`重做历史包含 ${redoHistory.length} 个操作`);
   * ```
   * 
   * @public
   */
  getRedoHistory(): ICommandSnapshot[] {
    return [...this.redoStack];
  }

  /**
   * 清空所有历史记录
   * 
   * 清除撤销栈和重做栈中的所有记录，同时清理所有已完成的事务。
   * 此操作不可撤销。
   * 
   * @example
   * ```typescript
   * // 用户点击"清空历史"按钮
   * undoManager.clear();
   * console.log('所有历史记录已清空');
   * 
   * // 更新UI状态
   * updateUndoRedoButtons();
   * ```
   * 
   * @public
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    
    // 清理已完成的事务
    for (const [id, transaction] of this.transactions) {
      if (transaction.status !== 'pending') {
        this.transactions.delete(id);
      }
    }
    
    this.log('清空历史记录');
    
    // 触发事件
    this.eventEmitter.emit({
      type: 'history.cleared',
      timestamp: Date.now()
    });
  }

  /**
   * 获取历史记录大小限制
   * 
   * @returns 当前设置的历史记录最大数量限制
   * 
   * @example
   * ```typescript
   * const currentLimit = undoManager.getHistoryLimit();
   * console.log(`当前历史记录限制: ${currentLimit}`);
   * ```
   * 
   * @public
   */
  getHistoryLimit(): number {
    return this.config.historyLimit;
  }

  /**
   * 设置历史记录大小限制
   * 
   * 设置撤销栈的最大大小。如果新限制小于当前历史记录数量，
   * 会删除最旧的记录以符合新限制。
   * 
   * @param limit - 新的历史记录大小限制，必须大于 0
   * 
   * @example
   * ```typescript
   * // 增加历史记录限制
   * undoManager.setHistoryLimit(500);
   * 
   * // 减少历史记录限制（会删除多余的旧记录）
   * undoManager.setHistoryLimit(50);
   * ```
   * 
   * @throws 如果 limit 小于等于 0 会抛出错误
   * @public
   */
  setHistoryLimit(limit: number): void {
    if (limit <= 0) {
      throw new Error('历史记录限制必须大于 0');
    }
    
    this.config.historyLimit = limit;
    
    // 如果当前历史超过新限制，删除多余的记录
    while (this.undoStack.length > limit) {
      const removed = this.undoStack.shift();
      this.log(`调整历史限制，移除记录: ${removed?.commandName}`);
    }
    
    this.log(`历史记录限制已设置为: ${limit}`);
  }

  /**
   * 开始事务
   * 
   * 启动一个新的撤销事务。如果当前已有活动事务，则会抛出错误。
   * 
   * @param name - 事务的名称
   * @param description - 事务的描述（可选）
   * @returns 事务的唯一标识符
   * 
   * @example
   * ```typescript
   * const txId = undoManager.beginTransaction('batchOperation');
   * console.log(`开始事务: ${txId}`);
   * 
   * // 在事务中记录多个命令
   * undoManager.record(snapshot1);
   * undoManager.record(snapshot2);
   * 
   * // 提交事务
   * undoManager.commitTransaction(txId);
   * console.log(`事务 ${txId} 已提交`);
   * ```
   * 
   * @throws 如果事务支持未启用或当前有活动事务，则抛出错误
   * @public
   */
  beginTransaction(name: string, description?: string): string {
    if (!this.config.enableTransactions) {
      throw new Error('事务支持未启用');
    }

    if (this.currentTransaction) {
      throw new Error(`已有活动事务: ${this.currentTransaction.name}`);
    }

    const transactionId = this.generateTransactionId();
    const transaction: ITransaction = {
      id: transactionId,
      name,
      description,
      snapshots: [],
      startTime: Date.now(),
      status: 'pending'
    };

    this.currentTransaction = transaction;
    this.transactions.set(transactionId, transaction);

    // 设置超时
    if (this.config.autoCleanupTransactions) {
      setTimeout(() => {
        if (this.currentTransaction?.id === transactionId && 
            this.currentTransaction.status === 'pending') {
          this.rollbackTransaction(transactionId);
          this.log(`事务 [${name}] 超时，已自动回滚`);
        }
      }, this.config.transactionTimeout);
    }

    // 触发事件
    this.eventEmitter.emit({
      type: 'transaction.started',
      timestamp: Date.now(),
      transaction
    });

    this.log(`开始事务: ${name}`);
    return transactionId;
  }

  /**
   * 提交事务
   * 
   * 提交一个已启动的事务。如果事务状态不是 'pending'，
   * 或者不是当前活动事务，则会抛出错误。
   * 
   * @param transactionId - 要提交的事务的唯一标识符
   * 
   * @example
   * ```typescript
   * const txId = undoManager.beginTransaction('batchOperation');
   * // ... 执行多个命令
   * undoManager.commitTransaction(txId);
   * console.log(`事务 ${txId} 已提交`);
   * ```
   * 
   * @throws 如果事务不存在、状态无效或不是当前活动事务，则抛出错误
   * @public
   */
  commitTransaction(transactionId: string): void {
    const transaction = this.transactions.get(transactionId);
    
    if (!transaction) {
      throw new Error(`事务不存在: ${transactionId}`);
    }

    if (transaction.status !== 'pending') {
      throw new Error(`事务状态无效: ${transaction.status}`);
    }

    if (this.currentTransaction?.id !== transactionId) {
      throw new Error(`不是当前活动事务: ${transactionId}`);
    }

    // 更新事务状态
    transaction.status = 'committed';
    transaction.endTime = Date.now();

    // 如果事务中有快照，创建一个代表整个事务的快照
    if (transaction.snapshots.length > 0) {
      // 创建事务撤销命令
      const transactionUndoCommand: IUndoableCommand = {
        name: `[事务] ${transaction.name}`,
        description: `撤销事务: ${transaction.name}`,
        undoable: true,
        execute: async () => ({ success: true }),
        undo: async () => {
          // 直接撤销事务中的所有操作（逆序）
          const snapshots = [...transaction.snapshots].reverse();
          for (const snapshot of snapshots) {
            const success = await this.undoSnapshot(snapshot);
            if (!success) {
              this.log(`事务撤销失败: ${transaction.name}`);
              return { success: false, error: `事务撤销失败: ${transaction.name}` };
            }
          }
          return { success: true };
        }
      };

      const transactionSnapshot: ICommandSnapshot = {
        id: `transaction-${transaction.id}`,
        commandName: `[事务] ${transaction.name}`,
        context: transaction.snapshots[0].context,
        result: {
          success: true,
          data: {
            transactionId: transaction.id,
            commandCount: transaction.snapshots.length
          }
        },
        timestamp: transaction.startTime,
        command: transactionUndoCommand,
        metadata: {
          isTransaction: true,
          transactionId: transaction.id
        }
      };

      this.undoStack.push(transactionSnapshot);
      this.redoStack = [];
    }

    this.currentTransaction = null;

    // 触发事件
    this.eventEmitter.emit({
      type: 'transaction.committed',
      timestamp: Date.now(),
      transaction
    });

    this.log(`提交事务: ${transaction.name} (${transaction.snapshots.length} 个操作)`);
  }

  /**
   * 回滚事务
   * 
   * 回滚一个已启动的事务。如果事务状态不是 'pending'，
   * 或者不是当前活动事务，则会抛出错误。
   * 
   * @param transactionId - 要回滚的事务的唯一标识符
   * 
   * @example
   * ```typescript
   * const txId = undoManager.beginTransaction('batchOperation');
   * // ... 执行多个命令
   * undoManager.rollbackTransaction(txId);
   * console.log(`事务 ${txId} 已回滚`);
   * ```
   * 
   * @throws 如果事务不存在、状态无效或不是当前活动事务，则抛出错误
   * @public
   */
  rollbackTransaction(transactionId: string): void {
    const transaction = this.transactions.get(transactionId);
    
    if (!transaction) {
      throw new Error(`事务不存在: ${transactionId}`);
    }

    if (transaction.status !== 'pending') {
      throw new Error(`事务状态无效: ${transaction.status}`);
    }

    if (this.currentTransaction?.id !== transactionId) {
      throw new Error(`不是当前活动事务: ${transactionId}`);
    }

    // 更新事务状态
    transaction.status = 'aborted';
    transaction.endTime = Date.now();

    // 撤销事务中的所有操作（逆序）
    const snapshots = [...transaction.snapshots].reverse();
    for (const snapshot of snapshots) {
      this.undoSnapshot(snapshot);
    }

    this.currentTransaction = null;

    // 触发事件
    this.eventEmitter.emit({
      type: 'transaction.aborted',
      timestamp: Date.now(),
      transaction
    });

    this.log(`回滚事务: ${transaction.name} (${transaction.snapshots.length} 个操作)`);
  }

  /**
   * 获取当前活动事务
   * 
   * 返回当前正在执行的事务对象，如果没有活动事务则返回 null。
   * 
   * @returns 当前活动事务对象或 null
   * 
   * @example
   * ```typescript
   * const currentTx = undoManager.getCurrentTransaction();
   * if (currentTx) {
   *   console.log(`当前活动事务: ${currentTx.name}`);
   * } else {
   *   console.log('没有活动事务');
   * }
   * ```
   * 
   * @public
   */
  getCurrentTransaction(): ITransaction | null {
    return this.currentTransaction;
  }

  /**
   * 获取事件发射器
   * 
   * 返回管理器的事件发射器实例，用于订阅撤销相关事件。
   * 
   * @returns 事件发射器实例
   * 
   * @example
   * ```typescript
   * const emitter = undoManager.getEventEmitter();
   * emitter.on('undo.executed', (event) => {
   *   console.log('撤销执行:', event.snapshot?.commandName);
   * });
   * ```
   * 
   * @public
   */
  getEventEmitter(): IUndoEventEmitter {
    return this.eventEmitter;
  }

  /**
   * 执行单个快照的撤销
   * 
   * 调用命令的 undo 方法来撤销单个命令。
   * 
   * @param snapshot - 要撤销的命令快照
   * @returns Promise 解析为撤销是否成功
   * 
   * @example
   * ```typescript
   * const success = await undoManager.undoSnapshot(snapshot);
   * if (success) {
   *   console.log(`撤销成功: ${snapshot.commandName}`);
   * } else {
   *   console.log(`撤销失败: ${snapshot.commandName}`);
   * }
   * ```
   * 
   * @private
   */
  private async undoSnapshot(snapshot: ICommandSnapshot): Promise<boolean> {
    const command = snapshot.command as IUndoableCommand;
    
    this.log(`尝试撤销命令: ${snapshot.commandName}`, {
      hasCommand: !!command,
      hasUndo: !!(command?.undo),
      snapshotId: snapshot.id
    });
    
    if (!command) {
      this.log(`命令 ${snapshot.commandName} 快照中缺少命令实例`);
      return false;
    }
    
    if (!command.undo) {
      this.log(`命令 ${snapshot.commandName} 不支持撤销（缺少 undo 方法）`);
      return false;
    }

    try {
      const result = await Promise.resolve(command.undo(snapshot));
      this.log(`撤销结果: ${snapshot.commandName}`, { success: result.success, error: result.error });
      return result.success;
    } catch (error) {
      this.log(`撤销异常: ${snapshot.commandName}`, error);
      return false;
    }
  }

  /**
   * 执行单个快照的重做
   * 
   * 调用命令的 redo 方法（如果存在）或重新执行原始命令。
   * 
   * @param snapshot - 要重做的命令快照
   * @returns Promise 解析为重做是否成功
   * 
   * @example
   * ```typescript
   * const success = await undoManager.redoSnapshot(snapshot);
   * if (success) {
   *   console.log(`重做成功: ${snapshot.commandName}`);
   * } else {
   *   console.log(`重做失败: ${snapshot.commandName}`);
   * }
   * ```
   * 
   * @private
   */
  private async redoSnapshot(snapshot: ICommandSnapshot): Promise<boolean> {
    const command = snapshot.command as IUndoableCommand;
    
    if (!command) {
      this.log(`命令 ${snapshot.commandName} 不存在`);
      return false;
    }

    // 如果有专门的重做方法，使用它
    if (command.redo) {
      const result = await Promise.resolve(command.redo(snapshot));
      return result.success;
    }

    // 否则使用原始的执行方法
    const result = await Promise.resolve(command.execute(snapshot.context));
    return result.success;
  }

  /**
   * 撤销事务
   * 
   * 按逆序调用事务中所有命令的 undo 方法。
   * 
   * @param transaction - 要撤销的事务
   * @returns Promise 解析为撤销是否成功
   * 
   * @example
   * ```typescript
   * const success = await undoManager.undoTransaction(transaction);
   * if (success) {
   *   console.log(`事务撤销成功: ${transaction.name}`);
   * } else {
   *   console.log(`事务撤销失败: ${transaction.name}`);
   * }
   * ```
   * 
   * @private
   */
  private async undoTransaction(transaction: ITransaction): Promise<boolean> {
    // 逆序撤销事务中的所有操作
    const snapshots = [...transaction.snapshots].reverse();
    
    for (const snapshot of snapshots) {
      const success = await this.undoSnapshot(snapshot);
      if (!success) {
        this.log(`事务撤销失败: ${transaction.name}`);
        return false;
      }
    }

    return true;
  }

  /**
   * 重做事务
   * 
   * 按顺序调用事务中所有命令的 redo 方法。
   * 
   * @param transaction - 要重做的事务
   * @returns Promise 解析为重做是否成功
   * 
   * @example
   * ```typescript
   * const success = await undoManager.redoTransaction(transaction);
   * if (success) {
   *   console.log(`事务重做成功: ${transaction.name}`);
   * } else {
   *   console.log(`事务重做失败: ${transaction.name}`);
   * }
   * ```
   * 
   * @private
   */
  private async redoTransaction(transaction: ITransaction): Promise<boolean> {
    // 顺序重做事务中的所有操作
    for (const snapshot of transaction.snapshots) {
      const success = await this.redoSnapshot(snapshot);
      if (!success) {
        this.log(`事务重做失败: ${transaction.name}`);
        return false;
      }
    }

    return true;
  }

  /**
   * 根据快照查找所属事务
   * 
   * 如果快照的 metadata 中包含 transactionId，则从事务映射表中查找对应的事务。
   * 
   * @param snapshot - 要查找的命令快照
   * @returns 找到的事务对象或 null
   * 
   * @example
   * ```typescript
   * const transaction = undoManager.findTransactionBySnapshot(snapshot);
   * if (transaction) {
   *   console.log(`快照 ${snapshot.id} 属于事务: ${transaction.name}`);
   * } else {
   *   console.log(`快照 ${snapshot.id} 不属于任何事务`);
   * }
   * ```
   * 
   * @private
   */
  private findTransactionBySnapshot(snapshot: ICommandSnapshot): ITransaction | null {
    if (snapshot.metadata?.isTransaction && snapshot.metadata.transactionId) {
      return this.transactions.get(snapshot.metadata.transactionId) || null;
    }
    return null;
  }

  /**
   * 生成事务ID
   * 
   * 生成一个唯一的字符串标识符，用于标识一个事务。
   * 
   * @returns 生成的唯一事务ID
   * 
   * @private
   */
  private generateTransactionId(): string {
    return `transaction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 日志输出
   * 
   * 在调试模式下输出日志信息。
   * 
   * @param message - 要输出的消息
   * @param data - 可选的日志数据
   * 
   * @private
   */
  private log(message: string, data?: any): void {
    if (this.config.debug) {
      console.log(`[UndoManager] ${message}`, data || '');
    }
  }
}

/**
 * 创建撤销管理器实例
 * 
 * 提供一个便捷方法来创建撤销管理器实例。
 * 
 * @param config - 撤销管理器配置选项
 * @returns 创建的撤销管理器实例
 * 
 * @example
 * ```typescript
 * const undoManager = createUndoManager({
 *   historyLimit: 50,
 *   debug: true,
 *   onUndoError: (error, snapshot) => {
 *     console.error('Undo failed', { command: snapshot.commandName, error });
 *   }
 * });
 * ```
 * 
 * @public
 */
export const createUndoManager = (config?: IUndoManagerConfig): UndoManager => {
  return new UndoManager(config);
}; 