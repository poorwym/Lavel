/**
 * 撤销管理器实现
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
 * 撤销事件发射器实现
 */
class UndoEventEmitter implements IUndoEventEmitter {
  private listeners: Map<UndoEventType, UndoEventListener[]> = new Map();

  on(eventType: UndoEventType, listener: UndoEventListener): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)?.push(listener);
  }

  off(eventType: UndoEventType, listener: UndoEventListener): void {
    const eventListeners = this.listeners.get(eventType);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

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
 * 撤销管理器实现
 */
export class UndoManager implements IUndoManager {
  private undoStack: ICommandSnapshot[] = [];
  private redoStack: ICommandSnapshot[] = [];
  private transactions: Map<string, ITransaction> = new Map();
  private currentTransaction: ITransaction | null = null;
  private config: Required<IUndoManagerConfig>;
  private eventEmitter: IUndoEventEmitter;

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
   * 记录命令执行
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
   * 执行撤销
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
   * 执行重做
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
   * 批量撤销
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
   * 批量重做
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
   * 检查是否可以撤销
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * 检查是否可以重做
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * 获取撤销历史
   */
  getUndoHistory(): ICommandSnapshot[] {
    return [...this.undoStack];
  }

  /**
   * 获取重做历史
   */
  getRedoHistory(): ICommandSnapshot[] {
    return [...this.redoStack];
  }

  /**
   * 清空历史记录
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.transactions.clear();
    this.currentTransaction = null;
    
    // 触发事件
    this.eventEmitter.emit({
      type: 'history.cleared',
      timestamp: Date.now()
    });
    
    this.log('历史记录已清空');
  }

  /**
   * 获取历史记录大小限制
   */
  getHistoryLimit(): number {
    return this.config.historyLimit;
  }

  /**
   * 设置历史记录大小限制
   */
  setHistoryLimit(limit: number): void {
    this.config.historyLimit = limit;
    
    // 如果当前历史超过新限制，裁剪
    while (this.undoStack.length > limit) {
      this.undoStack.shift();
    }
  }

  /**
   * 开始事务
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
   */
  getCurrentTransaction(): ITransaction | null {
    return this.currentTransaction;
  }

  /**
   * 获取事件发射器
   */
  getEventEmitter(): IUndoEventEmitter {
    return this.eventEmitter;
  }

  /**
   * 执行单个快照的撤销
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
   */
  private findTransactionBySnapshot(snapshot: ICommandSnapshot): ITransaction | null {
    if (snapshot.metadata?.isTransaction && snapshot.metadata.transactionId) {
      return this.transactions.get(snapshot.metadata.transactionId) || null;
    }
    return null;
  }

  /**
   * 生成事务ID
   */
  private generateTransactionId(): string {
    return `transaction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 日志输出
   */
  private log(message: string, data?: any): void {
    if (this.config.debug) {
      console.log(`[UndoManager] ${message}`, data || '');
    }
  }
}

/**
 * 创建撤销管理器实例
 */
export const createUndoManager = (config?: IUndoManagerConfig): UndoManager => {
  return new UndoManager(config);
}; 