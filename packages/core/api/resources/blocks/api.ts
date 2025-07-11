/**
 * @fileoverview Blocks 资源 API 接口模块
 * 
 * 提供与后端 Blocks 资源交互的所有 API 方法。Blocks 是 Lavel 系统中的基本内容单元，
 * 采用双向链表结构存储，支持父子关系和兄弟关系的管理。
 * 
 * 主要功能包括：
 * - 块的 CRUD 操作（创建、读取、更新、删除）
 * - 块的层级关系管理（父子关系、兄弟关系）
 * - 块的位置移动和重新排序
 * - 块的批量查询和分页获取
 * 
 * @author Lavel Team
 * @since 1.0.0
 */

import { ApiClient, ApiResponse, defaultApiClient } from '../../client';
import {
  Block,
  CreateBlockRequest,
  UpdateBlockRequest,
  ReplaceBlockRequest,
  MoveBlockRequest,
  BlockResponse,
  BlockListResponse,
  BlockChildrenResponse,
  BlockSiblingsResponse,
  MoveBlockResponse,
  DeleteBlockResponse,
  BlockListParams
} from './types';

/**
 * Blocks API 客户端类
 * 
 * 封装所有与 Blocks 资源相关的 API 操作，提供类型安全的接口方法。
 * 支持依赖注入的 ApiClient，便于测试和扩展。
 * 
 * @example
 * ```typescript
 * import { BlocksApi } from './api';
 * 
 * const blocksApi = new BlocksApi();
 * 
 * // 创建新块
 * const result = await blocksApi.createBlock({
 *   content: '这是一个新的块内容',
 *   parent_id: 'parent-block-id'
 * });
 * 
 * if (result.success) {
 *   console.log('创建成功:', result.data);
 * }
 * ```
 */
export class BlocksApi {
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
   * 获取 blocks 列表
   * 
   * 支持分页查询和条件过滤，可按父块ID、标签等条件筛选结果。
   * 
   * @param params - 查询参数，包括分页和过滤条件
   * @returns Promise 返回包含块列表和分页信息的响应
   * 
   * @example
   * ```typescript
   * // 获取第一页的20个块
   * const result = await blocksApi.listBlocks({ page: 1, limit: 20 });
   * 
   * // 获取特定父块下的所有子块
   * const children = await blocksApi.listBlocks({ parent_id: 'parent-id' });
   * 
   * // 按标签过滤块
   * const tagged = await blocksApi.listBlocks({ tags: 'important,work' });
   * ```
   */
  async listBlocks(params?: BlockListParams): Promise<ApiResponse<BlockListResponse>> {
    return this.client.get<BlockListResponse>('/blocks/', params);
  }

  /**
   * 创建新的 block
   * 
   * 创建一个新的内容块，可以指定其在双向链表中的位置关系。
   * 如果不指定位置，则会被添加到链表的末尾。
   * 
   * @param request - 创建块的请求参数
   * @returns Promise 返回创建的块信息
   * 
   * @example
   * ```typescript
   * // 创建根块
   * const rootBlock = await blocksApi.createBlock({
   *   content: '这是根块内容'
   * });
   * 
   * // 创建子块
   * const childBlock = await blocksApi.createBlock({
   *   content: '这是子块内容',
   *   parent_id: rootBlock.data.id
   * });
   * 
   * // 在特定位置插入块
   * const insertedBlock = await blocksApi.createBlock({
   *   content: '插入的块',
   *   parent_id: 'parent-id',
   *   prev_id: 'previous-sibling-id'
   * });
   * ```
   */
  async createBlock(request: CreateBlockRequest): Promise<ApiResponse<BlockResponse>> {
    return this.client.post<BlockResponse>('/blocks/', request);
  }

  /**
   * 获取指定 block
   * 
   * 根据块ID获取完整的块信息，包括内容和所有关系字段。
   * 
   * @param blockId - 块的唯一标识符
   * @returns Promise 返回块的详细信息
   * 
   * @throws {ApiError} 当块不存在时抛出错误
   * 
   * @example
   * ```typescript
   * try {
   *   const result = await blocksApi.getBlock('block-123');
   *   if (result.success) {
   *     console.log('块内容:', result.data.content);
   *     console.log('父块ID:', result.data.parent_id);
   *   }
   * } catch (error) {
   *   console.error('块不存在:', error);
   * }
   * ```
   */
  async getBlock(blockId: string): Promise<ApiResponse<BlockResponse>> {
    return this.client.get<BlockResponse>(`/blocks/${blockId}`);
  }

  /**
   * 部分更新 block
   * 
   * 仅更新提供的字段，未提供的字段保持不变。适用于局部修改场景。
   * 
   * @param blockId - 要更新的块ID
   * @param request - 更新请求参数，只需包含要修改的字段
   * @returns Promise 返回更新后的块信息
   * 
   * @example
   * ```typescript
   * // 只更新内容
   * await blocksApi.updateBlock('block-123', {
   *   content: '新的块内容'
   * });
   * 
   * // 更改父块关系
   * await blocksApi.updateBlock('block-123', {
   *   parent_id: 'new-parent-id'
   * });
   * ```
   */
  async updateBlock(blockId: string, request: UpdateBlockRequest): Promise<ApiResponse<BlockResponse>> {
    return this.client.patch<BlockResponse>(`/blocks/${blockId}`, request);
  }

  /**
   * 完全替换 block
   * 
   * 用新的数据完全替换现有块，未提供的可选字段将被清空。适用于完整重写场景。
   * 
   * @param blockId - 要替换的块ID
   * @param request - 替换请求参数，需要包含所有必要字段
   * @returns Promise 返回替换后的块信息
   * 
   * @example
   * ```typescript
   * // 完全替换块的所有内容
   * await blocksApi.replaceBlock('block-123', {
   *   content: '全新的块内容',
   *   parent_id: 'new-parent-id',
   *   prev_id: null, // 显式设置为第一个子块
   *   next_id: 'next-sibling-id'
   * });
   * ```
   */
  async replaceBlock(blockId: string, request: ReplaceBlockRequest): Promise<ApiResponse<BlockResponse>> {
    return this.client.put<BlockResponse>(`/blocks/${blockId}`, request);
  }

  /**
   * 删除 block
   * 
   * 删除指定的块，同时会自动处理双向链表的连接关系。
   * 如果块有子块，根据后端配置可能会级联删除或重新分配父节点。
   * 
   * @param blockId - 要删除的块ID
   * @returns Promise 返回删除操作的结果信息
   * 
   * @example
   * ```typescript
   * const result = await blocksApi.deleteBlock('block-123');
   * if (result.success) {
   *   console.log('删除成功:', result.data.message);
   * }
   * ```
   */
  async deleteBlock(blockId: string): Promise<ApiResponse<DeleteBlockResponse>> {
    return this.client.delete<DeleteBlockResponse>(`/blocks/${blockId}`);
  }

  /**
   * 获取 block 的子块列表
   * 
   * 获取指定块的所有直接子块，按照链表顺序返回。
   * 
   * @param blockId - 父块的ID
   * @returns Promise 返回子块列表
   * 
   * @example
   * ```typescript
   * const result = await blocksApi.getBlockChildren('parent-block-123');
   * if (result.success) {
   *   result.data.children.forEach(child => {
   *     console.log('子块:', child.content);
   *   });
   * }
   * ```
   */
  async getBlockChildren(blockId: string): Promise<ApiResponse<BlockChildrenResponse>> {
    return this.client.get<BlockChildrenResponse>(`/blocks/${blockId}/children`);
  }

  /**
   * 获取 block 的兄弟块列表
   * 
   * 获取与指定块具有相同父块的所有兄弟块，按照链表顺序返回。
   * 
   * @param blockId - 块的ID
   * @returns Promise 返回兄弟块列表
   * 
   * @example
   * ```typescript
   * const result = await blocksApi.getBlockSiblings('block-123');
   * if (result.success) {
   *   result.data.siblings.forEach(sibling => {
   *     console.log('兄弟块:', sibling.content);
   *   });
   * }
   * ```
   */
  async getBlockSiblings(blockId: string): Promise<ApiResponse<BlockSiblingsResponse>> {
    return this.client.get<BlockSiblingsResponse>(`/blocks/${blockId}/siblings`);
  }

  /**
   * 移动 block 位置
   * 
   * 在双向链表中移动块的位置，可以改变其父子关系和兄弟顺序。
   * 操作会自动维护链表的完整性。
   * 
   * @param blockId - 要移动的块ID
   * @param request - 移动请求参数，指定新的位置关系
   * @returns Promise 返回移动操作的结果和更新后的块信息
   * 
   * @example
   * ```typescript
   * // 将块移动到新的父块下
   * await blocksApi.moveBlock('block-123', {
   *   parent_id: 'new-parent-id'
   * });
   * 
   * // 调整兄弟块的顺序
   * await blocksApi.moveBlock('block-123', {
   *   prev_id: 'new-previous-sibling-id',
   *   next_id: 'new-next-sibling-id'
   * });
   * 
   * // 移动到根级别
   * await blocksApi.moveBlock('block-123', {
   *   parent_id: null
   * });
   * ```
   */
  async moveBlock(blockId: string, request: MoveBlockRequest): Promise<ApiResponse<MoveBlockResponse>> {
    return this.client.post<MoveBlockResponse>(`/blocks/${blockId}/move`, request);
  }
}

/**
 * 默认的 Blocks API 实例
 * 
 * 使用默认的 API 客户端创建的全局实例，可直接导入使用。
 * 
 * @example
 * ```typescript
 * import { blocksApi } from './api';
 * 
 * // 直接使用默认实例
 * const blocks = await blocksApi.listBlocks();
 * ```
 */
export const blocksApi = new BlocksApi();
