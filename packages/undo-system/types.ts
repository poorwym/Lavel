/**
 * @fileoverview 撤销系统类型定义模块
 * 
 * 提供完整的撤销/重做功能类型定义，包括：
 * - 可撤销命令接口
 * - 命令快照和事务管理
 * - 撤销管理器接口
 * - 事件系统和中间件配置
 * - 历史记录和持久化接口
 * 
 * @author alex
 * @since 1.0.0
 * @version 1.0.0
 * @public
 */

import { ICommand, ICommandContext, ICommandResult } from '@lavel/command-system';

/**
 * 可撤销命令接口
 * 
 * 扩展基础命令接口，添加撤销和重做功能支持。
 * 实现此接口的命令可以被撤销管理器自动管理。
 * 
 * @example
 * ```typescript
 * const editCommand: IUndoableCommand = {
 *   name: 'edit',
 *   description: '编辑文本',
 *   undoable: true,
 *   
 *   execute: async (context) => {
 *     const { text } = context.args;
 *     const oldText = getCurrentText();
 *     setCurrentText(text);
 *     
 *     context.env.previousState = { oldText };
 *     return { success: true, data: { newText: text } };
 *   },
 *   
 *   undo: async (snapshot) => {
 *     const { oldText } = snapshot.previousState;
 *     setCurrentText(oldText);
 *     return { success: true };
 *   },
 *   
 *   getUndoDescription: (snapshot) => {
 *     return `撤销编辑操作: ${snapshot.commandName}`;
 *   }
 * };
 * ```
 * 
 * @public
 * @since 1.0.0
 */
export interface IUndoableCommand extends ICommand {
  /**
   * 撤销操作函数
   * 
   * 当用户执行撤销时调用，应该将系统状态恢复到命令执行前。
   * 如果未提供，命令将被视为不可撤销。
   * 
   * @param snapshot - 命令执行时保存的快照，包含执行上下文和状态
   * @returns 撤销操作的结果，成功时应返回 success: true
   * 
   * @example
   * ```typescript
   * undo: async (snapshot) => {
   *   const { previousState } = snapshot;
   *   restoreState(previousState);
   *   return { success: true, data: { restored: true } };
   * }
   * ```
   */
  undo?: (snapshot: ICommandSnapshot) => Promise<ICommandResult> | ICommandResult;
  
  /**
   * 重做操作函数（可选）
   * 
   * 当用户执行重做时调用。如果不提供，将使用原始的 execute 方法。
   * 用于优化重做性能或处理特殊的重做逻辑。
   * 
   * @param snapshot - 命令执行时保存的快照
   * @returns 重做操作的结果
   * 
   * @example
   * ```typescript
   * redo: async (snapshot) => {
   *   const { currentState } = snapshot;
   *   applyState(currentState);
   *   return { success: true, data: { redone: true } };
   * }
   * ```
   */
  redo?: (snapshot: ICommandSnapshot) => Promise<ICommandResult> | ICommandResult;
  
  /**
   * 是否可以撤销
   * 
   * 控制命令是否被撤销系统管理。
   * 
   * @defaultValue true
   * @public
   */
  undoable?: boolean;
  
  /**
   * 获取撤销操作的用户友好描述
   * 
   * 用于在撤销历史列表或用户界面中显示操作描述。
   * 
   * @param snapshot - 命令快照
   * @returns 撤销操作的描述文本
   * 
   * @example
   * ```typescript
   * getUndoDescription: (snapshot) => {
   *   const { args } = snapshot.context;
   *   return `撤销删除文件: ${args.filename}`;
   * }
   * ```
   */
  getUndoDescription?: (snapshot: ICommandSnapshot) => string;
}

/**
 * 命令执行快照接口
 * 
 * 存储命令执行时的完整状态信息，用于支持撤销和重做操作。
 * 每次执行可撤销命令时都会创建一个快照。
 * 
 * @example
 * ```typescript
 * const snapshot: ICommandSnapshot = {
 *   id: 'snapshot-123',
 *   commandName: 'deleteFile',
 *   context: { args: { filename: 'test.txt' }, env: {} },
 *   result: { success: true },
 *   timestamp: Date.now(),
 *   previousState: { fileContent: 'original content' },
 *   currentState: { fileDeleted: true },
 *   metadata: { fileSize: 1024 }
 * };
 * ```
 * 
 * @public
 * @since 1.0.0
 */
export interface ICommandSnapshot {
  /**
   * 快照的唯一标识符
   * 
   * 由撤销管理器自动生成，用于快照的唯一标识和引用。
   * 
   * @public
   */
  id: string;
  
  /**
   * 执行的命令名称
   * 
   * 对应 ICommand.name，用于标识是哪个命令的快照。
   * 
   * @public
   */
  commandName: string;
  
  /**
   * 命令执行时的上下文
   * 
   * 包含命令参数、环境变量、用户信息等执行时的完整上下文。
   * 用于重做操作时重现执行环境。
   * 
   * @public
   */
  context: ICommandContext;
  
  /**
   * 命令执行的结果
   * 
   * 记录命令执行后的返回值，包含成功状态、数据和可能的错误信息。
   * 
   * @public
   */
  result: ICommandResult;
  
  /**
   * 命令执行的时间戳
   * 
   * Unix 时间戳，记录命令开始执行的时间。
   * 用于历史记录排序和过期清理。
   * 
   * @public
   */
  timestamp: number;
  
  /**
   * 命令实例引用（可选）
   * 
   * 指向原始命令对象的引用，用于执行撤销操作。
   * 对于动态命令或需要访问命令方法的场景非常有用。
   * 
   * @public
   */
  command?: IUndoableCommand;
  
  /**
   * 命令执行前的状态数据
   * 
   * 存储命令执行前的系统状态，用于撤销操作时恢复状态。
   * 具体内容由命令实现决定。
   * 
   * @example
   * ```typescript
   * previousState: {
   *   fileContent: 'original content',
   *   permissions: 0o644,
   *   lastModified: 1234567890
   * }
   * ```
   * 
   * @public
   */
  previousState?: any;
  
  /**
   * 命令执行后的状态数据
   * 
   * 存储命令执行后的系统状态，用于重做操作时应用状态。
   * 可选字段，如果不提供则重做时重新执行命令。
   * 
   * @example
   * ```typescript
   * currentState: {
   *   fileContent: 'new content',
   *   permissions: 0o755,
   *   lastModified: 1234567999
   * }
   * ```
   * 
   * @public
   */
  currentState?: any;
  
  /**
   * 快照的元数据信息
   * 
   * 存储额外的描述信息、统计数据或调试信息。
   * 不影响撤销/重做功能，主要用于监控和调试。
   * 
   * @example
   * ```typescript
   * metadata: {
   *   category: 'file-operation',
   *   executionTime: 150,
   *   affectedFiles: ['test.txt', 'backup.txt']
   * }
   * ```
   * 
   * @public
   */
  metadata?: Record<string, any>;
}

/**
 * 事务接口
 * 
 * 支持批量操作的原子撤销。将多个相关命令组织为一个逻辑单元，
 * 可以一次性撤销或重做整个事务中的所有操作。
 * 
 * @example
 * ```typescript
 * // 开始一个文件重命名事务
 * const transactionId = undoManager.beginTransaction(
 *   'renameFiles', 
 *   '批量重命名文件'
 * );
 * 
 * // 执行多个重命名操作...
 * 
 * // 提交事务
 * undoManager.commitTransaction(transactionId);
 * ```
 * 
 * @public
 * @since 1.0.0
 */
export interface ITransaction {
  /**
   * 事务的唯一标识符
   * 
   * 由撤销管理器生成，用于事务的引用和管理。
   * 
   * @public
   */
  id: string;
  
  /**
   * 事务的业务名称
   * 
   * 用于标识事务的业务含义，如 'batchDelete'、'moveFiles' 等。
   * 
   * @public
   */
  name: string;
  
  /**
   * 事务中包含的命令快照列表
   * 
   * 按执行顺序存储事务中所有命令的快照。
   * 撤销时按逆序执行，重做时按正序执行。
   * 
   * @public
   */
  snapshots: ICommandSnapshot[];
  
  /**
   * 事务开始时间
   * 
   * Unix 时间戳，记录事务开始的时间。
   * 
   * @public
   */
  startTime: number;
  
  /**
   * 事务结束时间（可选）
   * 
   * Unix 时间戳，记录事务提交或回滚的时间。
   * 只有当事务状态为 'committed' 或 'aborted' 时才有值。
   * 
   * @public
   */
  endTime?: number;
  
  /**
   * 事务的当前状态
   * 
   * - `pending`: 事务进行中，正在接收命令
   * - `committed`: 事务已提交，所有操作已确认
   * - `aborted`: 事务已回滚，所有操作已撤销
   * 
   * @public
   */
  status: 'pending' | 'committed' | 'aborted';
  
  /**
   * 事务的详细描述（可选）
   * 
   * 用于在用户界面中提供更详细的事务说明。
   * 
   * @example "批量删除用户选中的 5 个文件"
   * 
   * @public
   */
  description?: string;
}

/**
 * 撤销管理器接口
 * 
 * 提供完整的撤销/重做功能管理，包括单个命令和事务级别的操作。
 * 是撤销系统的核心组件，负责管理命令历史、执行撤销重做操作。
 * 
 * @example
 * ```typescript
 * const undoManager = createUndoManager({
 *   historyLimit: 50,
 *   debug: true
 * });
 * 
 * // 记录命令执行
 * undoManager.record(snapshot);
 * 
 * // 撤销操作
 * const success = await undoManager.undo();
 * 
 * // 事务操作
 * const txId = undoManager.beginTransaction('batchEdit');
 * // ... 执行多个命令
 * undoManager.commitTransaction(txId);
 * ```
 * 
 * @public
 * @since 1.0.0
 */
export interface IUndoManager {
  /**
   * 记录命令执行快照
   * 
   * 将命令执行的快照添加到撤销历史中。如果当前有活动事务，
   * 快照会被添加到事务中；否则直接添加到撤销栈。
   * 
   * @param snapshot - 要记录的命令快照
   * 
   * @example
   * ```typescript
   * const snapshot: ICommandSnapshot = {
   *   id: 'snap-001',
   *   commandName: 'delete',
   *   context: { args: { file: 'test.txt' } },
   *   result: { success: true },
   *   timestamp: Date.now(),
   *   previousState: { fileExists: true }
   * };
   * 
   * undoManager.record(snapshot);
   * ```
   * 
   * @public
   */
  record(snapshot: ICommandSnapshot): void;
  
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
   * } else {
   *   console.log('撤销失败或没有可撤销的操作');
   * }
   * ```
   * 
   * @throws 撤销过程中的任何错误都会被捕获并触发错误处理器
   * @public
   */
  undo(): Promise<boolean>;
  
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
   * }
   * ```
   * 
   * @throws 重做过程中的任何错误都会被捕获并触发错误处理器
   * @public
   */
  redo(): Promise<boolean>;
  
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
   * // 尝试撤销最近的 3 个操作
   * const undoneCount = await undoManager.undoMany(3);
   * console.log(`成功撤销了 ${undoneCount} 个操作`);
   * ```
   * 
   * @public
   */
  undoMany(steps: number): Promise<number>;
  
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
   * // 尝试重做最近撤销的 2 个操作
   * const redoneCount = await undoManager.redoMany(2);
   * console.log(`成功重做了 ${redoneCount} 个操作`);
   * ```
   * 
   * @public
   */
  redoMany(steps: number): Promise<number>;
  
  /**
   * 检查是否可以执行撤销
   * 
   * 检查撤销栈是否有可撤销的操作。
   * 
   * @returns 如果有可撤销的操作返回 true，否则返回 false
   * 
   * @example
   * ```typescript
   * if (undoManager.canUndo()) {
   *   await undoManager.undo();
   * } else {
   *   console.log('没有可撤销的操作');
   * }
   * ```
   * 
   * @public
   */
  canUndo(): boolean;
  
  /**
   * 检查是否可以执行重做
   * 
   * 检查重做栈是否有可重做的操作。
   * 
   * @returns 如果有可重做的操作返回 true，否则返回 false
   * 
   * @example
   * ```typescript
   * if (undoManager.canRedo()) {
   *   await undoManager.redo();
   * } else {
   *   console.log('没有可重做的操作');
   * }
   * ```
   * 
   * @public
   */
  canRedo(): boolean;
  
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
   * console.log(`有 ${history.length} 个可撤销的操作`);
   * history.forEach(snapshot => {
   *   console.log(`- ${snapshot.commandName} (${new Date(snapshot.timestamp)})`);
   * });
   * ```
   * 
   * @public
   */
  getUndoHistory(): ICommandSnapshot[];
  
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
   * console.log(`有 ${redoHistory.length} 个可重做的操作`);
   * ```
   * 
   * @public
   */
  getRedoHistory(): ICommandSnapshot[];
  
  /**
   * 清空所有历史记录
   * 
   * 清除撤销栈和重做栈中的所有记录，同时清理所有已完成的事务。
   * 此操作不可撤销。
   * 
   * @example
   * ```typescript
   * undoManager.clear();
   * console.log('所有历史记录已清空');
   * ```
   * 
   * @public
   */
  clear(): void;
  
  /**
   * 获取历史记录大小限制
   * 
   * 返回当前设置的历史记录最大数量限制。
   * 
   * @returns 历史记录大小限制
   * 
   * @example
   * ```typescript
   * const limit = undoManager.getHistoryLimit();
   * console.log(`当前历史记录限制: ${limit}`);
   * ```
   * 
   * @public
   */
  getHistoryLimit(): number;
  
  /**
   * 设置历史记录大小限制
   * 
   * 设置撤销栈的最大大小。当历史记录超过此限制时，
   * 最旧的记录会被自动删除。
   * 
   * @param limit - 新的历史记录大小限制，必须大于 0
   * 
   * @example
   * ```typescript
   * undoManager.setHistoryLimit(200);
   * console.log('历史记录限制已设置为 200');
   * ```
   * 
   * @throws 如果 limit 小于等于 0 会抛出错误
   * @public
   */
  setHistoryLimit(limit: number): void;
  
  /**
   * 开始一个新事务
   * 
   * 创建一个新的事务来组织相关的命令。在事务中执行的所有命令
   * 会被组织为一个逻辑单元，可以一次性撤销或重做。
   * 
   * @param name - 事务的业务名称
   * @param description - 事务的详细描述（可选）
   * @returns 事务的唯一标识符
   * 
   * @example
   * ```typescript
   * const txId = undoManager.beginTransaction(
   *   'batchEdit',
   *   '批量编辑用户选中的文件'
   * );
   * 
   * // 执行多个相关命令...
   * 
   * undoManager.commitTransaction(txId);
   * ```
   * 
   * @throws 如果已有活动事务会抛出错误
   * @public
   */
  beginTransaction(name: string, description?: string): string;
  
  /**
   * 提交事务
   * 
   * 将事务中的所有命令作为一个整体添加到撤销历史中。
   * 提交后的事务可以作为一个单元进行撤销。
   * 
   * @param transactionId - 要提交的事务 ID
   * 
   * @example
   * ```typescript
   * const txId = undoManager.beginTransaction('batchDelete');
   * // ... 执行命令
   * undoManager.commitTransaction(txId);
   * ```
   * 
   * @throws 如果事务 ID 不存在或事务状态无效会抛出错误
   * @public
   */
  commitTransaction(transactionId: string): void;
  
  /**
   * 回滚事务
   * 
   * 撤销事务中的所有命令并丢弃事务。回滚后的命令不会
   * 出现在撤销历史中。
   * 
   * @param transactionId - 要回滚的事务 ID
   * 
   * @example
   * ```typescript
   * const txId = undoManager.beginTransaction('riskyOperation');
   * try {
   *   // ... 执行可能失败的命令
   *   undoManager.commitTransaction(txId);
   * } catch (error) {
   *   undoManager.rollbackTransaction(txId);
   *   console.log('操作失败，已回滚所有更改');
   * }
   * ```
   * 
   * @throws 如果事务 ID 不存在会抛出错误
   * @public
   */
  rollbackTransaction(transactionId: string): void;
  
  /**
   * 获取当前活动的事务
   * 
   * 返回当前正在进行中的事务，如果没有活动事务则返回 null。
   * 
   * @returns 当前活动事务或 null
   * 
   * @example
   * ```typescript
   * const currentTx = undoManager.getCurrentTransaction();
   * if (currentTx) {
   *   console.log(`当前事务: ${currentTx.name}`);
   *   console.log(`已执行 ${currentTx.snapshots.length} 个命令`);
   * }
   * ```
   * 
   * @public
   */
  getCurrentTransaction(): ITransaction | null;
}

/**
 * 撤销管理器配置接口
 * 
 * 用于配置撤销管理器的行为和策略。所有配置项都是可选的，
 * 未设置的项将使用默认值。
 * 
 * @example
 * ```typescript
 * const config: IUndoManagerConfig = {
 *   historyLimit: 200,
 *   debug: true,
 *   enableTransactions: true,
 *   onUndoError: (error, snapshot) => {
 *     console.error(`撤销失败 [${snapshot.commandName}]:`, error);
 *     notifyUser(`撤销操作失败: ${error.message}`);
 *   },
 *   transactionTimeout: 30000
 * };
 * 
 * const undoManager = createUndoManager(config);
 * ```
 * 
 * @public
 * @since 1.0.0
 */
export interface IUndoManagerConfig {
  /**
   * 历史记录大小限制
   * 
   * 设置撤销栈可以保存的最大快照数量。当超过此限制时，
   * 最旧的快照会被自动删除。较大的值会占用更多内存，
   * 但提供更长的撤销历史。
   * 
   * @defaultValue 100
   * @example
   * ```typescript
   * // 设置为 50 适合轻量级应用
   * historyLimit: 50
   * 
   * // 设置为 500 适合文档编辑器等需要长历史的应用
   * historyLimit: 500
   * ```
   * 
   * @public
   */
  historyLimit?: number;
  
  /**
   * 是否启用调试日志
   * 
   * 当设置为 true 时，撤销管理器会输出详细的调试信息，
   * 包括命令记录、撤销/重做操作、事务管理等。
   * 
   * @defaultValue false
   * @example
   * ```typescript
   * debug: process.env.NODE_ENV === 'development'
   * ```
   * 
   * @public
   */
  debug?: boolean;
  
  /**
   * 是否启用事务支持
   * 
   * 控制是否启用事务功能。禁用事务可以轻微提升性能，
   * 但会失去批量操作的原子性撤销能力。
   * 
   * @defaultValue true
   * @example
   * ```typescript
   * // 对于简单应用可以禁用事务
   * enableTransactions: false
   * ```
   * 
   * @public
   */
  enableTransactions?: boolean;
  
  /**
   * 撤销操作失败时的错误处理器
   * 
   * 当撤销操作执行失败时调用此回调函数。可以用于
   * 错误日志记录、用户通知或错误恢复策略。
   * 
   * @param error - 撤销过程中发生的错误
   * @param snapshot - 尝试撤销的命令快照
   * 
   * @example
   * ```typescript
   * onUndoError: (error, snapshot) => {
   *   logger.error('Undo failed', {
   *     command: snapshot.commandName,
   *     error: error.message,
   *     timestamp: snapshot.timestamp
   *   });
   *   
   *   // 通知用户
   *   toast.error(`无法撤销 ${snapshot.commandName}: ${error.message}`);
   * }
   * ```
   * 
   * @public
   */
  onUndoError?: (error: Error, snapshot: ICommandSnapshot) => void;
  
  /**
   * 重做操作失败时的错误处理器
   * 
   * 当重做操作执行失败时调用此回调函数。可以用于
   * 错误日志记录、用户通知或错误恢复策略。
   * 
   * @param error - 重做过程中发生的错误
   * @param snapshot - 尝试重做的命令快照
   * 
   * @example
   * ```typescript
   * onRedoError: (error, snapshot) => {
   *   logger.error('Redo failed', {
   *     command: snapshot.commandName,
   *     error: error.message
   *   });
   *   
   *   // 尝试自动恢复
   *   if (error.name === 'TimeoutError') {
   *     scheduleRetry(snapshot);
   *   }
   * }
   * ```
   * 
   * @public
   */
  onRedoError?: (error: Error, snapshot: ICommandSnapshot) => void;
  
  /**
   * 是否自动清理过期的事务
   * 
   * 当设置为 true 时，系统会自动清理超时的未提交事务。
   * 这可以防止内存泄漏，特别是在长时间运行的应用中。
   * 
   * @defaultValue true
   * @example
   * ```typescript
   * autoCleanupTransactions: true
   * ```
   * 
   * @public
   */
  autoCleanupTransactions?: boolean;
  
  /**
   * 事务超时时间（毫秒）
   * 
   * 设置事务的最大生存时间。超过此时间未提交的事务
   * 会被自动回滚（如果启用了自动清理）。
   * 
   * @defaultValue 60000 (1分钟)
   * @example
   * ```typescript
   * // 设置为 5 分钟，适合复杂的批量操作
   * transactionTimeout: 5 * 60 * 1000
   * 
   * // 设置为 30 秒，适合快速操作
   * transactionTimeout: 30 * 1000
   * ```
   * 
   * @public
   */
  transactionTimeout?: number;
}

/**
 * 撤销事件类型联合类型
 * 
 * 定义撤销系统中所有可能的事件类型。事件系统允许监听
 * 撤销管理器的各种操作，用于实现审计、日志记录、UI更新等功能。
 * 
 * @example
 * ```typescript
 * // 监听撤销操作成功事件
 * undoManager.on('undo.executed', (event) => {
 *   console.log(`撤销了命令: ${event.snapshot?.commandName}`);
 *   updateUI();
 * });
 * 
 * // 监听事务提交事件
 * undoManager.on('transaction.committed', (event) => {
 *   console.log(`事务已提交: ${event.transaction?.name}`);
 * });
 * ```
 * 
 * @public
 * @since 1.0.0
 */
export type UndoEventType = 
  /** 撤销操作成功执行 */
  | 'undo.executed'
  /** 撤销操作执行失败 */
  | 'undo.failed'
  /** 重做操作成功执行 */
  | 'redo.executed'
  /** 重做操作执行失败 */
  | 'redo.failed'
  /** 历史记录已清空 */
  | 'history.cleared'
  /** 新的命令快照已记录 */
  | 'snapshot.recorded'
  /** 事务已开始 */
  | 'transaction.started'
  /** 事务已提交 */
  | 'transaction.committed'
  /** 事务已回滚 */
  | 'transaction.aborted';

/**
 * 撤销事件接口
 * 
 * 表示撤销系统中发生的各种事件。每个事件都包含事件类型、
 * 时间戳以及相关的上下文信息。
 * 
 * @example
 * ```typescript
 * // 监听撤销成功事件
 * undoManager.on('undo.executed', (event: IUndoEvent) => {
 *   console.log(`在 ${new Date(event.timestamp)} 撤销了命令: ${event.snapshot?.commandName}`);
 *   
 *   // 更新UI状态
 *   if (event.data?.affectedElements) {
 *     refreshUI(event.data.affectedElements);
 *   }
 * });
 * 
 * // 监听错误事件
 * undoManager.on('undo.failed', (event: IUndoEvent) => {
 *   console.error('撤销失败:', event.error?.message);
 *   showErrorNotification(event.error?.message);
 * });
 * ```
 * 
 * @public
 * @since 1.0.0
 */
export interface IUndoEvent {
  /**
   * 事件类型
   * 
   * 标识发生的具体事件类型，用于区分不同的操作结果。
   * 
   * @public
   */
  type: UndoEventType;
  
  /**
   * 事件发生的时间戳
   * 
   * Unix 时间戳，记录事件发生的精确时间。
   * 用于事件排序、日志记录和调试。
   * 
   * @public
   */
  timestamp: number;
  
  /**
   * 相关的命令快照（可选）
   * 
   * 对于命令相关的事件（如 undo.executed、redo.failed 等），
   * 包含触发事件的命令快照信息。
   * 
   * @example
   * ```typescript
   * if (event.snapshot) {
   *   console.log(`操作涉及命令: ${event.snapshot.commandName}`);
   *   console.log(`命令参数:`, event.snapshot.context.args);
   * }
   * ```
   * 
   * @public
   */
  snapshot?: ICommandSnapshot;
  
  /**
   * 相关的事务（可选）
   * 
   * 对于事务相关的事件（如 transaction.committed、transaction.aborted 等），
   * 包含相关的事务信息。
   * 
   * @example
   * ```typescript
   * if (event.transaction) {
   *   console.log(`事务: ${event.transaction.name}`);
   *   console.log(`包含 ${event.transaction.snapshots.length} 个命令`);
   * }
   * ```
   * 
   * @public
   */
  transaction?: ITransaction;
  
  /**
   * 额外的事件数据（可选）
   * 
   * 包含事件的附加信息，具体内容依赖于事件类型。
   * 可用于传递自定义数据或统计信息。
   * 
   * @example
   * ```typescript
   * // 撤销事件可能包含的数据
   * data: {
   *   affectedFiles: ['file1.txt', 'file2.txt'],
   *   executionTime: 150,
   *   memoryUsed: '2.5MB'
   * }
   * ```
   * 
   * @public
   */
  data?: any;
  
  /**
   * 错误信息（可选）
   * 
   * 对于失败事件（如 undo.failed、redo.failed），包含导致失败的错误信息。
   * 
   * @example
   * ```typescript
   * if (event.error) {
   *   console.error(`操作失败: ${event.error.message}`);
   *   logger.error('Undo operation failed', {
   *     error: event.error,
   *     command: event.snapshot?.commandName
   *   });
   * }
   * ```
   * 
   * @public
   */
  error?: Error;
}

/**
 * 撤销事件监听器函数类型
 * 
 * 定义用于处理撤销系统事件的回调函数签名。
 * 监听器函数接收一个事件对象作为参数。
 * 
 * @param event - 发生的撤销事件
 * 
 * @example
 * ```typescript
 * const listener: UndoEventListener = (event) => {
 *   switch (event.type) {
 *     case 'undo.executed':
 *       console.log('撤销成功:', event.snapshot?.commandName);
 *       break;
 *     case 'undo.failed':
 *       console.error('撤销失败:', event.error?.message);
 *       break;
 *     case 'transaction.committed':
 *       console.log('事务提交:', event.transaction?.name);
 *       break;
 *   }
 * };
 * 
 * undoManager.on('undo.executed', listener);
 * ```
 * 
 * @public
 * @since 1.0.0
 */
export type UndoEventListener = (event: IUndoEvent) => void;

/**
 * 撤销事件发射器接口
 * 
 * 提供事件订阅和发布功能，允许监听撤销系统中的各种操作。
 * 实现了标准的观察者模式，支持多个监听器订阅同一事件类型。
 * 
 * @example
 * ```typescript
 * // 添加监听器
 * const undoListener = (event: IUndoEvent) => {
 *   updateUndoButton(undoManager.canUndo());
 * };
 * 
 * undoManager.on('undo.executed', undoListener);
 * undoManager.on('redo.executed', undoListener);
 * 
 * // 移除监听器
 * undoManager.off('undo.executed', undoListener);
 * ```
 * 
 * @public
 * @since 1.0.0
 */
export interface IUndoEventEmitter {
  /**
   * 添加事件监听器
   * 
   * 注册一个监听器来处理指定类型的事件。同一个事件类型
   * 可以注册多个监听器，它们会按注册顺序被调用。
   * 
   * @param eventType - 要监听的事件类型
   * @param listener - 事件处理函数
   * 
   * @example
   * ```typescript
   * // 监听撤销操作
   * undoManager.on('undo.executed', (event) => {
   *   console.log(`撤销了: ${event.snapshot?.commandName}`);
   *   refreshHistoryUI();
   * });
   * 
   * // 监听所有失败事件
   * undoManager.on('undo.failed', handleUndoFailure);
   * undoManager.on('redo.failed', handleRedoFailure);
   * ```
   * 
   * @public
   */
  on(eventType: UndoEventType, listener: UndoEventListener): void;
  
  /**
   * 移除事件监听器
   * 
   * 从指定事件类型中移除一个监听器。如果同一监听器被多次注册，
   * 只会移除第一个匹配的实例。
   * 
   * @param eventType - 事件类型
   * @param listener - 要移除的监听器函数
   * 
   * @example
   * ```typescript
   * const listener = (event) => console.log(event.type);
   * 
   * // 添加监听器
   * undoManager.on('undo.executed', listener);
   * 
   * // 移除监听器
   * undoManager.off('undo.executed', listener);
   * ```
   * 
   * @public
   */
  off(eventType: UndoEventType, listener: UndoEventListener): void;
  
  /**
   * 触发事件
   * 
   * 向所有注册的监听器发送事件。这个方法通常由撤销管理器
   * 内部调用，不建议外部直接使用。
   * 
   * @param event - 要发送的事件对象
   * 
   * @example
   * ```typescript
   * // 通常由撤销管理器内部调用
   * this.eventEmitter.emit({
   *   type: 'undo.executed',
   *   timestamp: Date.now(),
   *   snapshot: commandSnapshot
   * });
   * ```
   * 
   * @internal
   */
  emit(event: IUndoEvent): void;
}

/**
 * 撤销中间件配置接口
 * 
 * 用于配置撤销中间件的行为，控制哪些命令被记录、
 * 如何处理快照以及其他中间件行为。
 * 
 * @example
 * ```typescript
 * const config: IUndoMiddlewareConfig = {
 *   undoManager: myUndoManager,
 *   autoRecord: true,
 *   
 *   // 只记录特定类别的命令
 *   filter: (command, context) => {
 *     return command.category !== 'query' && 
 *            !command.name.startsWith('temp-');
 *   },
 *   
 *   // 清理敏感信息
 *   transformSnapshot: (snapshot) => {
 *     const cleaned = { ...snapshot };
 *     if (cleaned.context.args.password) {
 *       cleaned.context.args.password = '***';
 *     }
 *     return cleaned;
 *   }
 * };
 * 
 * const middleware = createUndoMiddleware(config);
 * ```
 * 
 * @public
 * @since 1.0.0
 */
export interface IUndoMiddlewareConfig {
  /**
   * 撤销管理器实例
   * 
   * 中间件使用的撤销管理器，用于记录命令快照。
   * 
   * @public
   */
  undoManager: IUndoManager;
  
  /**
   * 是否自动记录所有可撤销命令
   * 
   * 当设置为 true 时，中间件会自动记录所有标记为可撤销的命令。
   * 设置为 false 时，需要手动控制记录行为。
   * 
   * @defaultValue true
   * @example
   * ```typescript
   * // 禁用自动记录，需要手动控制
   * autoRecord: false
   * ```
   * 
   * @public
   */
  autoRecord?: boolean;
  
  /**
   * 命令过滤器函数
   * 
   * 用于决定哪些命令应该被记录到撤销历史中。
   * 返回 true 表示应该记录该命令，返回 false 则跳过。
   * 
   * @param command - 要检查的命令
   * @param context - 命令执行上下文
   * @returns 是否应该记录这个命令
   * 
   * @example
   * ```typescript
   * // 只记录用户操作，跳过系统操作
   * filter: (command, context) => {
   *   return context.user && command.category !== 'system';
   * }
   * 
   * // 跳过只读操作
   * filter: (command, context) => {
   *   return !command.name.startsWith('get-') && 
   *          !command.name.startsWith('list-');
   * }
   * ```
   * 
   * @public
   */
  filter?: (command: ICommand, context: ICommandContext) => boolean;
  
  /**
   * 快照转换器函数
   * 
   * 在快照被记录到撤销管理器之前对其进行修改或清理。
   * 可用于移除敏感信息、压缩数据或添加额外的元数据。
   * 
   * @param snapshot - 原始快照
   * @returns 转换后的快照
   * 
   * @example
   * ```typescript
   * // 清理敏感信息
   * transformSnapshot: (snapshot) => {
   *   const cleaned = JSON.parse(JSON.stringify(snapshot));
   *   
   *   // 移除密码字段
   *   if (cleaned.context.args.password) {
   *     cleaned.context.args.password = '[REDACTED]';
   *   }
   *   
   *   // 添加额外元数据
   *   cleaned.metadata = {
   *     ...cleaned.metadata,
   *     processedAt: Date.now(),
   *     version: '1.0'
   *   };
   *   
   *   return cleaned;
   * }
   * ```
   * 
   * @public
   */
  transformSnapshot?: (snapshot: ICommandSnapshot) => ICommandSnapshot;
}

/**
 * 历史记录项接口
 * 
 * 用于在用户界面中展示撤销历史的标准化数据结构。
 * 将内部的快照和事务数据转换为用户友好的格式。
 * 
 * @example
 * ```typescript
 * // 显示历史记录列表
 * const historyItems: IHistoryItem[] = undoHistory.map(snapshot => ({
 *   id: snapshot.id,
 *   type: 'command',
 *   displayName: snapshot.commandName,
 *   description: snapshot.command?.description,
 *   timestamp: snapshot.timestamp,
 *   canUndo: true
 * }));
 * 
 * // 渲染历史列表
 * historyItems.forEach(item => {
 *   const timeStr = new Date(item.timestamp).toLocaleString();
 *   console.log(`${item.displayName} - ${timeStr}`);
 *   
 *   if (item.children) {
 *     item.children.forEach(child => {
 *       console.log(`  └─ ${child.displayName}`);
 *     });
 *   }
 * });
 * ```
 * 
 * @public
 * @since 1.0.0
 */
export interface IHistoryItem {
  /**
   * 历史项的唯一标识符
   * 
   * 对应快照ID或事务ID，用于引用具体的历史记录。
   * 
   * @public
   */
  id: string;
  
  /**
   * 历史项类型
   * 
   * 区分单个命令和事务，用于UI中的不同展示方式。
   * 
   * @public
   */
  type: 'command' | 'transaction';
  
  /**
   * 用户友好的显示名称
   * 
   * 在历史列表中显示的简短名称，通常是命令名或事务名。
   * 
   * @example "删除文件"、"批量重命名"、"格式化文档"
   * 
   * @public
   */
  displayName: string;
  
  /**
   * 详细描述（可选）
   * 
   * 提供更详细的操作说明，可用于工具提示或详情面板。
   * 
   * @example "删除了 3 个文件: file1.txt, file2.txt, file3.txt"
   * 
   * @public
   */
  description?: string;
  
  /**
   * 操作发生的时间戳
   * 
   * Unix 时间戳，用于排序和显示操作时间。
   * 
   * @public
   */
  timestamp: number;
  
  /**
   * 是否可以撤销
   * 
   * 指示这个历史项当前是否可以被撤销。
   * 某些情况下（如依赖的资源已被删除）可能无法撤销。
   * 
   * @public
   */
  canUndo: boolean;
  
  /**
   * 子项列表（用于事务）
   * 
   * 当类型为 'transaction' 时，包含事务中所有命令的历史项。
   * 用于展示事务的层级结构。
   * 
   * @example
   * ```typescript
   * // 事务历史项示例
   * const transactionItem: IHistoryItem = {
   *   id: 'tx-001',
   *   type: 'transaction',
   *   displayName: '批量文件操作',
   *   description: '移动并重命名 5 个文件',
   *   timestamp: Date.now(),
   *   canUndo: true,
   *   children: [
   *     { id: 'snap-001', type: 'command', displayName: '移动 file1.txt', ... },
   *     { id: 'snap-002', type: 'command', displayName: '重命名 file2.txt', ... },
   *     // ...
   *   ]
   * };
   * ```
   * 
   * @public
   */
  children?: IHistoryItem[];
}

/**
 * 撤销历史持久化接口
 * 
 * 定义撤销历史的持久化行为，允许在应用重启后恢复撤销历史。
 * 可以实现为文件存储、数据库存储或其他持久化方案。
 * 
 * @example
 * ```typescript
 * // 文件系统实现示例
 * class FileUndoPersistence implements IUndoPersistence {
 *   private filePath = './.undo-history.json';
 *   
 *   async save(undoStack: ICommandSnapshot[], redoStack: ICommandSnapshot[]): Promise<void> {
 *     const data = { undoStack, redoStack, timestamp: Date.now() };
 *     await fs.writeFile(this.filePath, JSON.stringify(data, null, 2));
 *   }
 *   
 *   async load(): Promise<{ undoStack: ICommandSnapshot[]; redoStack: ICommandSnapshot[] }> {
 *     try {
 *       const content = await fs.readFile(this.filePath, 'utf-8');
 *       const data = JSON.parse(content);
 *       return { undoStack: data.undoStack || [], redoStack: data.redoStack || [] };
 *     } catch {
 *       return { undoStack: [], redoStack: [] };
 *     }
 *   }
 *   
 *   async clear(): Promise<void> {
 *     await fs.unlink(this.filePath).catch(() => {});
 *   }
 * }
 * 
 * // 使用持久化
 * const persistence = new FileUndoPersistence();
 * const undoManager = createUndoManager({ persistence });
 * ```
 * 
 * @public
 * @since 1.0.0
 */
export interface IUndoPersistence {
  /**
   * 保存撤销历史到持久化存储
   * 
   * 将当前的撤销栈和重做栈保存到持久化存储中。
   * 通常在应用关闭前或定期调用。
   * 
   * @param undoStack - 撤销栈的快照数组
   * @param redoStack - 重做栈的快照数组
   * 
   * @example
   * ```typescript
   * // 保存历史到文件
   * await persistence.save(
   *   undoManager.getUndoHistory(),
   *   undoManager.getRedoHistory()
   * );
   * 
   * // 应用退出时自动保存
   * process.on('exit', async () => {
   *   await persistence.save(undoStack, redoStack);
   * });
   * ```
   * 
   * @throws 保存过程中的任何错误（如磁盘空间不足、权限不足等）
   * @public
   */
  save(undoStack: ICommandSnapshot[], redoStack: ICommandSnapshot[]): Promise<void>;
  
  /**
   * 从持久化存储加载撤销历史
   * 
   * 应用启动时调用，恢复之前保存的撤销和重做历史。
   * 如果没有保存的历史或加载失败，应返回空数组。
   * 
   * @returns Promise 解析为包含撤销栈和重做栈的对象
   * 
   * @example
   * ```typescript
   * // 应用启动时恢复历史
   * const { undoStack, redoStack } = await persistence.load();
   * undoManager.restoreHistory(undoStack, redoStack);
   * 
   * // 处理加载失败的情况
   * try {
   *   const history = await persistence.load();
   *   console.log(`恢复了 ${history.undoStack.length} 个撤销记录`);
   * } catch (error) {
   *   console.warn('无法加载撤销历史:', error.message);
   *   // 从空历史开始
   * }
   * ```
   * 
   * @throws 加载过程中的任何错误（如文件不存在、格式错误等）
   * @public
   */
  load(): Promise<{ undoStack: ICommandSnapshot[]; redoStack: ICommandSnapshot[] }>;
  
  /**
   * 清空持久化的撤销历史
   * 
   * 删除所有保存的撤销历史数据。通常在用户明确要求
   * 清空历史或重置应用状态时调用。
   * 
   * @example
   * ```typescript
   * // 用户点击"清空历史"按钮
   * await persistence.clear();
   * undoManager.clear();
   * console.log('撤销历史已完全清空');
   * 
   * // 重置应用状态
   * const resetApp = async () => {
   *   await persistence.clear();
   *   await clearUserData();
   *   location.reload();
   * };
   * ```
   * 
   * @throws 清空过程中的任何错误（如权限不足等）
   * @public
   */
  clear(): Promise<void>;
} 