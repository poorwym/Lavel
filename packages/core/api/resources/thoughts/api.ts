/**
 * @fileoverview Thoughts 资源 API 接口模块
 * 
 * 提供与后端 Thoughts 资源交互的所有 API 方法。Thoughts 是 Lavel 系统中的轻量级
 * 思考笔记单元，用于快速记录想法、灵感和临时内容，支持升级为正式的知识文档。
 * 
 * 核心特性：
 * - 轻量级快速创建和编辑
 * - 灵活的标签分类系统
 * - 升级为知识文档的转换功能
 * - 全文搜索和内容发现
 * - 与其他资源的轻量关联
 * 
 * @author Lavel Team
 * @since 1.0.0
 */

import { ApiClient, ApiResponse, defaultApiClient } from '../../client';
import {
  CreateThoughtRequest,
  UpdateThoughtRequest,
  UpgradeThoughtToKnowledgeRequest,
  ThoughtResponse,
  ThoughtListResponse,
  DeleteThoughtResponse,
  ThoughtSearchResponse,
  UpgradeThoughtToKnowledgeResponse,
  ThoughtListParams
} from './types';

/**
 * Thoughts API 客户端类
 * 
 * 封装所有与 Thoughts 资源相关的 API 操作，提供类型安全的接口方法。
 * Thoughts 作为 Lavel 中最轻量的内容单元，专注于快速记录和后续整理。
 * 
 * @example
 * ```typescript
 * import { ThoughtsApi } from './api';
 * 
 * const thoughtsApi = new ThoughtsApi();
 * 
 * // 快速创建思考笔记
 * const thought = await thoughtsApi.createThought({
 *   summary: '关于微服务架构的思考',
 *   tags: ['architecture', 'microservices', 'ideas']
 * });
 * 
 * // 后续升级为知识文档
 * if (thought.success) {
 *   await thoughtsApi.upgradeThoughtToKnowledge(thought.data.id, {
 *     title: '微服务架构设计指南',
 *     description: '基于实践经验的微服务设计原则和最佳实践'
 *   });
 * }
 * ```
 */
export class ThoughtsApi {
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
   * 获取思考笔记列表
   * 
   * 支持分页查询和多种过滤条件，包括标签过滤、搜索关键词等。
   * 适用于浏览和管理大量的思考笔记。
   * 
   * @param params - 查询参数，包括分页和过滤条件
   * @returns Promise 返回包含思考笔记列表和分页信息的响应
   * 
   * @example
   * ```typescript
   * // 获取所有思考笔记
   * const allThoughts = await thoughtsApi.listThoughts();
   * 
   * // 按标签过滤
   * const ideaThoughts = await thoughtsApi.listThoughts({
   *   tags: 'ideas,inspiration'
   * });
   * 
   * // 搜索特定内容
   * const searchResults = await thoughtsApi.listThoughts({
   *   search: '设计模式',
   *   page: 1,
   *   limit: 10
   * });
   * ```
   */
  async listThoughts(params?: ThoughtListParams): Promise<ApiResponse<ThoughtListResponse>> {
    return this.client.get<ThoughtListResponse>('/thoughts/', params);
  }

  /**
   * 创建新的思考笔记
   * 
   * 创建一个轻量级的思考笔记，通常用于快速记录想法、灵感或临时内容。
   * 创建后会自动生成根块用于存储详细内容。
   * 
   * @param request - 创建思考笔记的请求参数
   * @returns Promise 返回创建的思考笔记信息
   * 
   * @example
   * ```typescript
   * // 创建简单的思考笔记
   * const quickThought = await thoughtsApi.createThought({
   *   summary: '关于用户体验优化的想法'
   * });
   * 
   * // 创建带标签的思考笔记
   * const taggedThought = await thoughtsApi.createThought({
   *   summary: '新的产品功能构想',
   *   tags: ['product', 'features', 'brainstorm']
   * });
   * ```
   */
  async createThought(request: CreateThoughtRequest): Promise<ApiResponse<ThoughtResponse>> {
    return this.client.post<ThoughtResponse>('/thoughts/', request);
  }

  /**
   * 获取指定思考笔记
   * 
   * 根据思考笔记 ID 获取完整的笔记信息，包括摘要、标签和根块信息。
   * 
   * @param thoughtId - 思考笔记的唯一标识符
   * @returns Promise 返回思考笔记的详细信息
   * 
   * @throws {ApiError} 当思考笔记不存在时抛出错误
   * 
   * @example
   * ```typescript
   * try {
   *   const thought = await thoughtsApi.getThought('thought-123');
   *   if (thought.success) {
   *     console.log('笔记摘要:', thought.data.summary);
   *     console.log('标签:', thought.data.tags);
   *     console.log('根块ID:', thought.data.root_block_id);
   *   }
   * } catch (error) {
   *   console.error('思考笔记不存在:', error);
   * }
   * ```
   */
  async getThought(thoughtId: string): Promise<ApiResponse<ThoughtResponse>> {
    return this.client.get<ThoughtResponse>(`/thoughts/${thoughtId}`);
  }

  /**
   * 更新思考笔记
   * 
   * 更新思考笔记的摘要和标签信息。这是轻量级的元数据更新，
   * 详细内容的修改需要通过 Block API 操作根块。
   * 
   * @param thoughtId - 要更新的思考笔记 ID
   * @param request - 更新请求参数
   * @returns Promise 返回更新后的思考笔记信息
   * 
   * @example
   * ```typescript
   * // 更新摘要和标签
   * await thoughtsApi.updateThought('thought-123', {
   *   summary: '更新后的思考笔记摘要',
   *   tags: ['updated', 'refined', 'important']
   * });
   * 
   * // 只更新标签
   * await thoughtsApi.updateThought('thought-123', {
   *   tags: ['archived', 'completed']
   * });
   * ```
   */
  async updateThought(thoughtId: string, request: UpdateThoughtRequest): Promise<ApiResponse<ThoughtResponse>> {
    return this.client.patch<ThoughtResponse>(`/thoughts/${thoughtId}`, request);
  }

  /**
   * 删除思考笔记
   * 
   * 删除指定的思考笔记及其关联的根块。这是不可逆的操作，
   * 建议在删除前考虑是否升级为知识文档保存重要内容。
   * 
   * @param thoughtId - 要删除的思考笔记 ID
   * @returns Promise 返回删除操作的结果信息
   * 
   * @example
   * ```typescript
   * const result = await thoughtsApi.deleteThought('thought-123');
   * if (result.success) {
   *   console.log('删除成功:', result.data.message);
   * }
   * ```
   */
  async deleteThought(thoughtId: string): Promise<ApiResponse<DeleteThoughtResponse>> {
    return this.client.delete<DeleteThoughtResponse>(`/thoughts/${thoughtId}`);
  }

  /**
   * 搜索思考笔记
   * 
   * 根据关键词在思考笔记的摘要和内容中进行全文搜索。
   * 返回相关度排序的搜索结果，便于快速找到相关的想法和灵感。
   * 
   * @param query - 搜索关键词
   * @returns Promise 返回搜索结果，包含相关度得分
   * 
   * @example
   * ```typescript
   * const searchResults = await thoughtsApi.searchThoughts('用户体验');
   * if (searchResults.success) {
   *   searchResults.data.results.forEach(result => {
   *     console.log(`相关度 ${result.score}: ${result.thought.summary}`);
   *   });
   * }
   * ```
   */
  async searchThoughts(query: string): Promise<ApiResponse<ThoughtSearchResponse>> {
    return this.client.get<ThoughtSearchResponse>('/thoughts/search', { q: query });
  }

  /**
   * 将思考笔记升级为知识文档
   * 
   * 这是 Thoughts 模块的核心功能之一，将轻量级的思考笔记转换为
   * 结构化的知识文档。原有的内容会被保留并迁移到新的知识文档中。
   * 
   * @param thoughtId - 要升级的思考笔记 ID
   * @param request - 升级请求参数，包含新知识文档的元数据
   * @returns Promise 返回升级操作的结果和新创建的知识文档信息
   * 
   * @example
   * ```typescript
   * // 升级思考笔记为知识文档
   * const result = await thoughtsApi.upgradeThoughtToKnowledge('thought-123', {
   *   title: '用户体验设计原则',
   *   description: '基于实际项目总结的UX设计原则和方法论',
   *   additional_tags: ['ux', 'design', 'principles']
   * });
   * 
   * if (result.success) {
   *   console.log('升级成功:', result.data.message);
   *   console.log('新知识文档:', result.data.knowledge);
   * }
   * ```
   */
  async upgradeThoughtToKnowledge(thoughtId: string, request: UpgradeThoughtToKnowledgeRequest): Promise<ApiResponse<UpgradeThoughtToKnowledgeResponse>> {
    return this.client.post<UpgradeThoughtToKnowledgeResponse>(`/thoughts/${thoughtId}/upgrade`, request);
  }
}

/**
 * 默认的 Thoughts API 实例
 * 
 * 使用默认的 API 客户端创建的全局实例，可直接导入使用。
 * 
 * @example
 * ```typescript
 * import { thoughtsApi } from './api';
 * 
 * // 直接使用默认实例
 * const thoughts = await thoughtsApi.listThoughts();
 * ```
 */
export const thoughtsApi = new ThoughtsApi(); 