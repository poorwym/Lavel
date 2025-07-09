/**
 * 撤销系统类型定义
 */

import { ICommand, ICommandContext, ICommandResult } from '@lavel/command-system';

/**
 * 可撤销命令接口
 * 扩展基础命令接口，添加撤销功能
 */
export interface IUndoableCommand extends ICommand {
  /**
   * 撤销操作
   * @param snapshot 命令执行时的快照
   * @returns 撤销操作的结果
   */
  undo?: (snapshot: ICommandSnapshot) => Promise<ICommandResult> | ICommandResult;
  
  /**
   * 重做操作（可选）
   * 如果不提供，将使用原始的 execute 方法
   * @param snapshot 命令执行时的快照
   * @returns 重做操作的结果
   */
  redo?: (snapshot: ICommandSnapshot) => Promise<ICommandResult> | ICommandResult;
  
  /**
   * 是否可以撤销
   * 默认为 true
   */
  undoable?: boolean;
  
  /**
   * 获取撤销操作的描述
   * 用于在UI中显示
   */
  getUndoDescription?: (snapshot: ICommandSnapshot) => string;
}

/**
 * 命令执行快照
 * 存储命令执行时的完整状态
 */
export interface ICommandSnapshot {
  /**
   * 快照ID
   */
  id: string;
  
  /**
   * 命令名称
   */
  commandName: string;
  
  /**
   * 执行时的上下文
   */
  context: ICommandContext;
  
  /**
   * 执行结果
   */
  result: ICommandResult;
  
  /**
   * 执行时间戳
   */
  timestamp: number;
  
  /**
   * 命令实例（用于撤销）
   */
  command?: IUndoableCommand;
  
  /**
   * 额外的状态数据
   * 可以存储命令执行前的状态，用于撤销
   */
  previousState?: any;
  
  /**
   * 当前状态数据
   * 可以存储命令执行后的状态，用于重做
   */
  currentState?: any;
  
  /**
   * 元数据
   */
  metadata?: Record<string, any>;
}

/**
 * 事务接口
 * 支持批量操作的原子撤销
 */
export interface ITransaction {
  /**
   * 事务ID
   */
  id: string;
  
  /**
   * 事务名称
   */
  name: string;
  
  /**
   * 事务中的命令快照列表
   */
  snapshots: ICommandSnapshot[];
  
  /**
   * 事务开始时间
   */
  startTime: number;
  
  /**
   * 事务结束时间
   */
  endTime?: number;
  
  /**
   * 事务状态
   */
  status: 'pending' | 'committed' | 'aborted';
  
  /**
   * 事务描述
   */
  description?: string;
}

/**
 * 撤销管理器接口
 */
export interface IUndoManager {
  /**
   * 记录命令执行
   */
  record(snapshot: ICommandSnapshot): void;
  
  /**
   * 执行撤销
   * @returns 撤销是否成功
   */
  undo(): Promise<boolean>;
  
  /**
   * 执行重做
   * @returns 重做是否成功
   */
  redo(): Promise<boolean>;
  
  /**
   * 批量撤销
   * @param steps 撤销步数
   */
  undoMany(steps: number): Promise<number>;
  
  /**
   * 批量重做
   * @param steps 重做步数
   */
  redoMany(steps: number): Promise<number>;
  
  /**
   * 检查是否可以撤销
   */
  canUndo(): boolean;
  
  /**
   * 检查是否可以重做
   */
  canRedo(): boolean;
  
  /**
   * 获取撤销历史
   */
  getUndoHistory(): ICommandSnapshot[];
  
  /**
   * 获取重做历史
   */
  getRedoHistory(): ICommandSnapshot[];
  
  /**
   * 清空历史记录
   */
  clear(): void;
  
  /**
   * 获取历史记录大小限制
   */
  getHistoryLimit(): number;
  
  /**
   * 设置历史记录大小限制
   */
  setHistoryLimit(limit: number): void;
  
  /**
   * 开始事务
   */
  beginTransaction(name: string, description?: string): string;
  
  /**
   * 提交事务
   */
  commitTransaction(transactionId: string): void;
  
  /**
   * 回滚事务
   */
  rollbackTransaction(transactionId: string): void;
  
  /**
   * 获取当前活动事务
   */
  getCurrentTransaction(): ITransaction | null;
}

/**
 * 撤销管理器配置
 */
export interface IUndoManagerConfig {
  /**
   * 历史记录大小限制
   * 默认: 100
   */
  historyLimit?: number;
  
  /**
   * 是否启用调试日志
   */
  debug?: boolean;
  
  /**
   * 是否启用事务支持
   */
  enableTransactions?: boolean;
  
  /**
   * 撤销操作失败时的处理策略
   */
  onUndoError?: (error: Error, snapshot: ICommandSnapshot) => void;
  
  /**
   * 重做操作失败时的处理策略
   */
  onRedoError?: (error: Error, snapshot: ICommandSnapshot) => void;
  
  /**
   * 是否自动清理过期的事务
   */
  autoCleanupTransactions?: boolean;
  
  /**
   * 事务超时时间（毫秒）
   */
  transactionTimeout?: number;
}

/**
 * 撤销事件类型
 */
export type UndoEventType = 
  | 'undo.executed'
  | 'undo.failed'
  | 'redo.executed'
  | 'redo.failed'
  | 'history.cleared'
  | 'snapshot.recorded'
  | 'transaction.started'
  | 'transaction.committed'
  | 'transaction.aborted';

/**
 * 撤销事件
 */
export interface IUndoEvent {
  /**
   * 事件类型
   */
  type: UndoEventType;
  
  /**
   * 事件时间戳
   */
  timestamp: number;
  
  /**
   * 相关的命令快照
   */
  snapshot?: ICommandSnapshot;
  
  /**
   * 相关的事务
   */
  transaction?: ITransaction;
  
  /**
   * 事件数据
   */
  data?: any;
  
  /**
   * 错误信息
   */
  error?: Error;
}

/**
 * 撤销事件监听器
 */
export type UndoEventListener = (event: IUndoEvent) => void;

/**
 * 撤销事件发射器接口
 */
export interface IUndoEventEmitter {
  /**
   * 添加事件监听器
   */
  on(eventType: UndoEventType, listener: UndoEventListener): void;
  
  /**
   * 移除事件监听器
   */
  off(eventType: UndoEventType, listener: UndoEventListener): void;
  
  /**
   * 触发事件
   */
  emit(event: IUndoEvent): void;
}

/**
 * 撤销中间件配置
 */
export interface IUndoMiddlewareConfig {
  /**
   * 撤销管理器实例
   */
  undoManager: IUndoManager;
  
  /**
   * 是否自动记录所有可撤销命令
   * 默认: true
   */
  autoRecord?: boolean;
  
  /**
   * 命令过滤器
   * 返回 true 表示该命令应该被记录
   */
  filter?: (command: ICommand, context: ICommandContext) => boolean;
  
  /**
   * 快照转换器
   * 可以在记录前修改快照
   */
  transformSnapshot?: (snapshot: ICommandSnapshot) => ICommandSnapshot;
}

/**
 * 历史记录项
 * 用于UI展示
 */
export interface IHistoryItem {
  /**
   * 快照或事务ID
   */
  id: string;
  
  /**
   * 类型
   */
  type: 'command' | 'transaction';
  
  /**
   * 显示名称
   */
  displayName: string;
  
  /**
   * 描述
   */
  description?: string;
  
  /**
   * 时间戳
   */
  timestamp: number;
  
  /**
   * 是否可以撤销
   */
  canUndo: boolean;
  
  /**
   * 子项（用于事务）
   */
  children?: IHistoryItem[];
}

/**
 * 持久化接口
 * 用于保存和恢复撤销历史
 */
export interface IUndoPersistence {
  /**
   * 保存撤销历史
   */
  save(undoStack: ICommandSnapshot[], redoStack: ICommandSnapshot[]): Promise<void>;
  
  /**
   * 加载撤销历史
   */
  load(): Promise<{ undoStack: ICommandSnapshot[]; redoStack: ICommandSnapshot[] }>;
  
  /**
   * 清空持久化数据
   */
  clear(): Promise<void>;
} 