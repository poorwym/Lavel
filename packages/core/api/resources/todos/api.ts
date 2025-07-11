/**
 * @fileoverview Todos 资源 API 接口模块
 * 
 * 提供与后端 Todos 资源交互的所有 API 方法。Todos 是 Lavel 系统中的任务管理单元，
 * 支持复杂的子任务结构、DAG 依赖关系、状态管理和智能扩展功能。
 * 
 * 核心特性：
 * - 层级任务结构（主任务 + 子任务）
 * - DAG（有向无环图）依赖关系管理
 * - 任务状态自动流转和级联更新
 * - 智能任务扩展和分解
 * - 知识库链接和上下文关联
 * 
 * @author Lavel Team
 * @since 1.0.0
 */

import { ApiClient, ApiResponse, defaultApiClient } from '../../client';
import {
  CreateTodoRequest,
  UpdateTodoMetadataRequest,
  UpdateTodoStatusRequest,
  UpdateSubtaskStatusRequest,
  AddSubtaskRequest,
  TodoResponse,
  TodoListResponse,
  TodoSubtasksResponse,
  UpdateTodoStatusResponse,
  UpdateSubtaskStatusResponse,
  AddSubtaskResponse,
  DeleteTodoResponse,
  TodoSearchResponse,
  TodoListParams
} from './types';

/**
 * Todos API 客户端类
 * 
 * 封装所有与 Todos 资源相关的 API 操作，提供类型安全的接口方法。
 * 支持复杂的任务管理功能，包括 DAG 结构的子任务、状态管理、智能扩展等。
 * 
 * @example
 * ```typescript
 * import { TodosApi } from './api';
 * 
 * const todosApi = new TodosApi();
 * 
 * // 创建带自动扩展的任务
 * const result = await todosApi.createTodo({
 *   title: '开发用户认证系统',
 *   description: '实现完整的用户注册、登录、权限管理功能',
 *   auto_expand: true,
 *   expand_prompt: '请将此任务分解为具体的开发步骤'
 * });
 * ```
 */
export class TodosApi {
  /** API 客户端实例 */
  private client: ApiClient;

  /**
   * 构造函数
   * 
   * @param client - API 客户端实例，默认使用全局默认客户端
   */
  constructor(client: ApiClient = defaultApiClient) {
    this.client = client;
  }

  /**
   * 获取任务列表
   * 
   * 支持分页查询和多种过滤条件，包括状态、标签、截止时间等。
   * 返回的任务包含子任务统计信息。
   * 
   * @param params - 查询参数，包括分页和过滤条件
   * @returns Promise 返回包含任务列表和分页信息的响应
   * 
   * @example
   * ```typescript
   * // 获取进行中的任务
   * const activeTodos = await todosApi.listTodos({
   *   status: 'in_progress',
   *   page: 1,
   *   limit: 10
   * });
   * 
   * // 按标签过滤任务
   * const workTodos = await todosApi.listTodos({
   *   tags: 'work,urgent'
   * });
   * ```
   */
  async listTodos(params?: TodoListParams): Promise<ApiResponse<TodoListResponse>> {
    return this.client.get<TodoListResponse>('/todos/', params);
  }

  /**
   * 创建新任务
   * 
   * 创建一个新的任务，支持自动智能扩展为子任务。
   * 如果启用自动扩展，系统会根据描述和提示词自动生成子任务 DAG 结构。
   * 
   * @param request - 创建任务的请求参数
   * @returns Promise 返回创建的任务信息
   * 
   * @example
   * ```typescript
   * // 创建简单任务
   * const basicTodo = await todosApi.createTodo({
   *   title: '完成项目文档',
   *   description: '编写项目的技术文档和用户手册',
   *   due_date: '2024-12-31',
   *   tags: ['documentation', 'writing']
   * });
   * 
   * // 创建带智能扩展的复杂任务
   * const complexTodo = await todosApi.createTodo({
   *   title: '开发移动端应用',
   *   description: '开发跨平台移动应用，包含用户认证、数据同步等功能',
   *   auto_expand: true,
   *   expand_prompt: '请分解为具体的开发任务，包含设计、开发、测试阶段',
   *   linked_knowledge: ['mobile-dev-guide', 'api-specs']
   * });
   * ```
   */
  async createTodo(request: CreateTodoRequest): Promise<ApiResponse<TodoResponse>> {
    return this.client.post<TodoResponse>('/todos/', request);
  }

  /**
   * 获取指定任务
   * 
   * 根据任务 ID 获取完整的任务信息，包括所有子任务和统计数据。
   * 
   * @param todoId - 任务的唯一标识符
   * @returns Promise 返回任务的详细信息
   * 
   * @example
   * ```typescript
   * const todo = await todosApi.getTodo('todo-123');
   * if (todo.success) {
   *   console.log('任务标题:', todo.data.title);
   *   console.log('子任务数量:', todo.data.subtasks.length);
   *   console.log('完成率:', todo.data.subtasks_stats.completion_rate);
   * }
   * ```
   */
  async getTodo(todoId: string): Promise<ApiResponse<TodoResponse>> {
    return this.client.get<TodoResponse>(`/todos/${todoId}`);
  }

  /**
   * 更新任务元数据
   * 
   * 更新任务的基本信息，如标题、描述、标签等，不影响任务状态和子任务。
   * 
   * @param todoId - 要更新的任务 ID
   * @param request - 更新请求参数
   * @returns Promise 返回更新后的任务信息
   * 
   * @example
   * ```typescript
   * // 更新任务信息
   * await todosApi.updateTodoMetadata('todo-123', {
   *   title: '更新后的任务标题',
   *   description: '更详细的任务描述',
   *   due_date: '2024-12-31',
   *   tags: ['updated', 'important']
   * });
   * ```
   */
  async updateTodoMetadata(todoId: string, request: UpdateTodoMetadataRequest): Promise<ApiResponse<TodoResponse>> {
    return this.client.patch<TodoResponse>(`/todos/${todoId}`, request);
  }

  /**
   * 更新任务状态
   * 
   * 更改任务的状态，支持级联更新子任务状态。
   * 状态变更会自动处理依赖关系和触发相关的业务逻辑。
   * 
   * @param todoId - 要更新的任务 ID
   * @param request - 状态更新请求参数
   * @returns Promise 返回状态更新结果和级联影响信息
   * 
   * @example
   * ```typescript
   * // 标记任务为完成
   * const result = await todosApi.updateTodoStatus('todo-123', {
   *   status: 'done',
   *   completion_note: '所有功能已实现并通过测试',
   *   actual_completion_date: '2024-01-15'
   * });
   * 
   * if (result.success) {
   *   console.log('状态更新:', result.data.status_change);
   *   console.log('级联更新:', result.data.cascade_updates);
   * }
   * ```
   */
  async updateTodoStatus(todoId: string, request: UpdateTodoStatusRequest): Promise<ApiResponse<UpdateTodoStatusResponse>> {
    return this.client.patch<UpdateTodoStatusResponse>(`/todos/${todoId}/status`, request);
  }

  /**
   * 删除任务
   * 
   * 删除指定的任务及其所有子任务。会自动处理依赖关系和清理相关数据。
   * 
   * @param todoId - 要删除的任务 ID
   * @returns Promise 返回删除操作的结果信息
   * 
   * @example
   * ```typescript
   * const result = await todosApi.deleteTodo('todo-123');
   * if (result.success) {
   *   console.log('删除成功:', result.data.message);
   * }
   * ```
   */
  async deleteTodo(todoId: string): Promise<ApiResponse<DeleteTodoResponse>> {
    return this.client.delete<DeleteTodoResponse>(`/todos/${todoId}`);
  }

  /**
   * 获取任务的子任务列表
   * 
   * 获取指定任务的所有子任务，包括 DAG 结构信息和统计数据。
   * 返回的数据可用于渲染任务依赖图和进度可视化。
   * 
   * @param todoId - 父任务的 ID
   * @returns Promise 返回子任务列表、DAG 信息和统计数据
   * 
   * @example
   * ```typescript
   * const subtasks = await todosApi.getTodoSubtasks('todo-123');
   * if (subtasks.success) {
   *   console.log('子任务列表:', subtasks.data.subtasks);
   *   console.log('DAG 节点:', subtasks.data.dag_info.nodes);
   *   console.log('依赖关系:', subtasks.data.dag_info.edges);
   *   console.log('完成率:', subtasks.data.statistics.completion_rate);
   * }
   * ```
   */
  async getTodoSubtasks(todoId: string): Promise<ApiResponse<TodoSubtasksResponse>> {
    return this.client.get<TodoSubtasksResponse>(`/todos/${todoId}/subtasks`);
  }

  /**
   * 添加子任务
   * 
   * 为指定任务添加新的子任务，可以指定依赖关系。
   * 系统会自动验证 DAG 结构的有效性，防止循环依赖。
   * 
   * @param todoId - 父任务的 ID
   * @param request - 添加子任务的请求参数
   * @returns Promise 返回添加的子任务信息和更新后的父任务
   * 
   * @example
   * ```typescript
   * // 添加独立子任务
   * const subtask1 = await todosApi.addSubtask('todo-123', {
   *   title: '设计数据库架构',
   *   description: '设计用户、权限等核心表结构'
   * });
   * 
   * // 添加有依赖的子任务
   * const subtask2 = await todosApi.addSubtask('todo-123', {
   *   title: '实现用户认证',
   *   description: '基于设计的数据库实现认证逻辑',
   *   depends_on: [subtask1.data.subtask.id]
   * });
   * ```
   */
  async addSubtask(todoId: string, request: AddSubtaskRequest): Promise<ApiResponse<AddSubtaskResponse>> {
    return this.client.post<AddSubtaskResponse>(`/todos/${todoId}/subtasks`, request);
  }

  /**
   * 更新子任务状态
   * 
   * 更改子任务的完成状态，会自动检查和更新父任务状态。
   * 支持依赖关系的自动解锁和状态传播。
   * 
   * @param todoId - 父任务的 ID
   * @param subtaskId - 子任务的 ID
   * @param request - 状态更新请求参数
   * @returns Promise 返回子任务更新结果和对父任务的影响
   * 
   * @example
   * ```typescript
   * // 标记子任务为完成
   * const result = await todosApi.updateSubtaskStatus('todo-123', 'subtask-456', {
   *   status: 'done'
   * });
   * 
   * if (result.success) {
   *   console.log('子任务更新:', result.data.subtask_update);
   *   if (result.data.parent_status_update) {
   *     console.log('父任务状态变化:', result.data.parent_status_update);
   *   }
   * }
   * ```
   */
  async updateSubtaskStatus(todoId: string, subtaskId: string, request: UpdateSubtaskStatusRequest): Promise<ApiResponse<UpdateSubtaskStatusResponse>> {
    return this.client.patch<UpdateSubtaskStatusResponse>(`/todos/${todoId}/subtasks/${subtaskId}/status`, request);
  }

  /**
   * 搜索任务
   * 
   * 根据关键词在任务的标题、描述和子任务中进行全文搜索。
   * 返回相关度排序的搜索结果。
   * 
   * @param query - 搜索关键词
   * @returns Promise 返回搜索结果，包含相关度得分
   * 
   * @example
   * ```typescript
   * const searchResults = await todosApi.searchTodos('用户认证');
   * if (searchResults.success) {
   *   searchResults.data.results.forEach(result => {
   *     console.log(`相关度 ${result.score}: ${result.todo.title}`);
   *   });
   * }
   * ```
   */
  async searchTodos(query: string): Promise<ApiResponse<TodoSearchResponse>> {
    return this.client.get<TodoSearchResponse>('/todos/search', { q: query });
  }
}

/**
 * 默认的 Todos API 实例
 * 
 * 使用默认的 API 客户端创建的全局实例，可直接导入使用。
 * 
 * @example
 * ```typescript
 * import { todosApi } from './api';
 * 
 * // 直接使用默认实例
 * const todos = await todosApi.listTodos();
 * ```
 */
export const todosApi = new TodosApi(); 