/**
 * @fileoverview Knowledges 资源 API 接口模块
 * 
 * 提供与后端 Knowledges 资源交互的所有 API 方法。Knowledges 是 Lavel 系统中的
 * 结构化知识文档，支持详细的内容编辑、标签管理、反向链接等高级功能。
 * 
 * 主要功能包括：
 * - 知识文档的 CRUD 操作（创建、读取、更新、删除）
 * - 知识文档的元数据管理（标题、描述、标签）
 * - 块与知识文档的关联管理
 * - 反向链接查询和搜索功能
 * 
 * @author Lavel Team
 * @since 1.0.0
 */

import { ApiClient, ApiResponse, defaultApiClient } from '../../client';
import {
  CreateKnowledgeRequest,
  UpdateKnowledgeMetadataRequest,
  LinkBlockToKnowledgeRequest,
  KnowledgeResponse,
  KnowledgeListResponse,
  KnowledgeBacklinksResponse,
  LinkBlockToKnowledgeResponse,
  DeleteKnowledgeResponse,
  KnowledgeSearchResponse,
  KnowledgeListParams
} from './types';

/**
 * Knowledges API 客户端类
 * 
 * 封装所有与 Knowledges 资源相关的 API 操作，提供类型安全的接口方法。
 * 知识文档是基于 Block 系统构建的高级内容单元，支持复杂的内容结构和关联关系。
 * 
 * @example
 * ```typescript
 * import { KnowledgesApi } from './api';
 * 
 * const knowledgesApi = new KnowledgesApi();
 * 
 * // 创建知识文档
 * const result = await knowledgesApi.createKnowledge({
 *   title: '学习笔记：TypeScript 高级特性',
 *   description: '深入理解 TypeScript 的高级类型系统',
 *   tags: ['typescript', 'programming', 'learning']
 * });
 * ```
 */
export class KnowledgesApi {
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
   * 获取知识文档列表
   * 
   * 支持分页查询和多种过滤条件，包括标签过滤、搜索关键词等。
   * 
   * @param params - 查询参数，包括分页和过滤条件
   * @returns Promise 返回包含知识文档列表和分页信息的响应
   * 
   * @example
   * ```typescript
   * // 获取所有知识文档
   * const allKnowledge = await knowledgesApi.listKnowledges();
   * 
   * // 按标签过滤
   * const programmingDocs = await knowledgesApi.listKnowledges({
   *   tags: 'programming,typescript'
   * });
   * 
   * // 搜索特定内容
   * const searchResults = await knowledgesApi.listKnowledges({
   *   search: '设计模式',
   *   page: 1,
   *   limit: 10
   * });
   * ```
   */
  async listKnowledges(params?: KnowledgeListParams): Promise<ApiResponse<KnowledgeListResponse>> {
    return this.client.get<KnowledgeListResponse>('/knowledges/', params);
  }

  /**
   * 创建新的知识文档
   * 
   * 创建一个新的知识文档，会自动生成根块用于存储内容。
   * 可以在创建时指定初始内容和关联的块。
   * 
   * @param request - 创建知识文档的请求参数
   * @returns Promise 返回创建的知识文档信息
   * 
   * @example
   * ```typescript
   * // 创建基本知识文档
   * const basicDoc = await knowledgesApi.createKnowledge({
   *   title: '项目文档',
   *   description: '项目相关的技术文档和规范'
   * });
   * 
   * // 创建带内容的知识文档
   * const docWithContent = await knowledgesApi.createKnowledge({
   *   title: 'API 设计指南',
   *   description: 'RESTful API 设计最佳实践',
   *   content: '# API 设计指南\n\n这是初始内容...',
   *   tags: ['api', 'design', 'guidelines']
   * });
   * ```
   */
  async createKnowledge(request: CreateKnowledgeRequest): Promise<ApiResponse<KnowledgeResponse>> {
    return this.client.post<KnowledgeResponse>('/knowledges/', request);
  }

  /**
   * 获取指定知识文档
   * 
   * 根据知识文档 ID 获取完整的文档信息，包括元数据和关联的块信息。
   * 
   * @param knowledgeId - 知识文档的唯一标识符
   * @returns Promise 返回知识文档的详细信息
   * 
   * @throws {ApiError} 当知识文档不存在时抛出错误
   * 
   * @example
   * ```typescript
   * try {
   *   const knowledge = await knowledgesApi.getKnowledge('doc-123');
   *   if (knowledge.success) {
   *     console.log('文档标题:', knowledge.data.title);
   *     console.log('标签:', knowledge.data.tags);
   *     console.log('关联块:', knowledge.data.linked_blocks);
   *   }
   * } catch (error) {
   *   console.error('知识文档不存在:', error);
   * }
   * ```
   */
  async getKnowledge(knowledgeId: string): Promise<ApiResponse<KnowledgeResponse>> {
    return this.client.get<KnowledgeResponse>(`/knowledges/${knowledgeId}`);
  }

  /**
   * 更新知识文档元数据
   * 
   * 仅更新知识文档的元数据信息（标题、描述、标签等），不影响内容块。
   * 适用于批量修改文档属性的场景。
   * 
   * @param knowledgeId - 要更新的知识文档 ID
   * @param request - 更新请求参数，只需包含要修改的字段
   * @returns Promise 返回更新后的知识文档信息
   * 
   * @example
   * ```typescript
   * // 更新标题和标签
   * await knowledgesApi.updateKnowledgeMetadata('doc-123', {
   *   title: '新的文档标题',
   *   tags: ['updated', 'revised', 'important']
   * });
   * 
   * // 只更新描述
   * await knowledgesApi.updateKnowledgeMetadata('doc-123', {
   *   description: '更详细的文档描述信息'
   * });
   * ```
   */
  async updateKnowledgeMetadata(knowledgeId: string, request: UpdateKnowledgeMetadataRequest): Promise<ApiResponse<KnowledgeResponse>> {
    return this.client.patch<KnowledgeResponse>(`/knowledges/${knowledgeId}`, request);
  }

  /**
   * 删除知识文档
   * 
   * 删除指定的知识文档，同时会处理相关的块和反向链接。
   * 根据配置，可能会删除关联的块或将其转换为独立块。
   * 
   * @param knowledgeId - 要删除的知识文档 ID
   * @returns Promise 返回删除操作的结果信息
   * 
   * @example
   * ```typescript
   * const result = await knowledgesApi.deleteKnowledge('doc-123');
   * if (result.success) {
   *   console.log('删除成功:', result.data.message);
   * }
   * ```
   */
  async deleteKnowledge(knowledgeId: string): Promise<ApiResponse<DeleteKnowledgeResponse>> {
    return this.client.delete<DeleteKnowledgeResponse>(`/knowledges/${knowledgeId}`);
  }

  /**
   * 获取知识文档的反向链接
   * 
   * 查找所有引用了指定知识文档的其他资源，包括其他知识文档、思考笔记、
   * 任务和独立块等。有助于理解知识的关联关系。
   * 
   * @param knowledgeId - 知识文档 ID
   * @returns Promise 返回反向链接信息
   * 
   * @example
   * ```typescript
   * const backlinks = await knowledgesApi.getKnowledgeBacklinks('doc-123');
   * if (backlinks.success) {
   *   console.log('引用的知识文档:', backlinks.data.knowledges);
   *   console.log('引用的思考笔记:', backlinks.data.thoughts);
   *   console.log('引用的任务:', backlinks.data.todos);
   *   console.log('引用的块:', backlinks.data.blocks);
   * }
   * ```
   */
  async getKnowledgeBacklinks(knowledgeId: string): Promise<ApiResponse<KnowledgeBacklinksResponse>> {
    return this.client.get<KnowledgeBacklinksResponse>(`/knowledges/${knowledgeId}/backlinks`);
  }

  /**
   * 将块链接到知识文档
   * 
   * 将指定的块关联到知识文档中，可以指定链接类型和位置。
   * 适用于将独立块或其他资源的块整合到知识文档中。
   * 
   * @param knowledgeId - 目标知识文档 ID
   * @param request - 链接请求参数
   * @returns Promise 返回链接操作的结果和更新后的知识文档信息
   * 
   * @example
   * ```typescript
   * // 将块链接到知识文档
   * const result = await knowledgesApi.linkBlockToKnowledge('doc-123', {
   *   block_id: 'block-456',
   *   position: 2,
   *   link_type: 'reference'
   * });
   * 
   * if (result.success) {
   *   console.log('链接成功:', result.data.message);
   *   console.log('更新后的文档:', result.data.knowledge);
   * }
   * ```
   */
  async linkBlockToKnowledge(knowledgeId: string, request: LinkBlockToKnowledgeRequest): Promise<ApiResponse<LinkBlockToKnowledgeResponse>> {
    return this.client.post<LinkBlockToKnowledgeResponse>(`/knowledges/${knowledgeId}/link-block`, request);
  }

  /**
   * 搜索知识文档
   * 
   * 根据关键词在知识文档的标题、描述和内容中进行全文搜索。
   * 返回相关度排序的搜索结果。
   * 
   * @param query - 搜索关键词
   * @returns Promise 返回搜索结果，包含相关度得分
   * 
   * @example
   * ```typescript
   * const searchResults = await knowledgesApi.searchKnowledges('设计模式');
   * if (searchResults.success) {
   *   searchResults.data.results.forEach(result => {
   *     console.log(`相关度 ${result.score}: ${result.knowledge.title}`);
   *   });
   * }
   * ```
   */
  async searchKnowledges(query: string): Promise<ApiResponse<KnowledgeSearchResponse>> {
    return this.client.get<KnowledgeSearchResponse>('/knowledges/search', { q: query });
  }
}

/**
 * 默认的 Knowledges API 实例
 * 
 * 使用默认的 API 客户端创建的全局实例，可直接导入使用。
 * 
 * @example
 * ```typescript
 * import { knowledgesApi } from './api';
 * 
 * // 直接使用默认实例
 * const knowledges = await knowledgesApi.listKnowledges();
 * ```
 */
export const knowledgesApi = new KnowledgesApi(); 