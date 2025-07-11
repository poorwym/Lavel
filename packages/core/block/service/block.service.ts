/**
 * Block 核心业务逻辑服务
 * 封装 block 相关的业务操作，提供高级 API 给命令系统使用
 */

import {
  BlockResponse,
  BlockListResponse,
  BlockChildrenResponse,
  BlockSiblingsResponse,
  CreateBlockRequest,
  UpdateBlockRequest,
  ReplaceBlockRequest,
  MoveBlockRequest,
  MoveBlockResponse,
  DeleteBlockResponse,
  ListBlocksParams
} from '../model/block.model';

import { BlockApi, BlockApiError, blockApi } from '../api/block.api';

/**
 * 服务错误类
 */
export class BlockServiceError extends Error {
  constructor(
    message: string,
    public code?: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'BlockServiceError';
  }
}

/**
 * Block 服务配置
 */
export interface BlockServiceConfig {
  api?: BlockApi;
  validateOnCreate?: boolean;
  validateOnUpdate?: boolean;
  autoGenerateIds?: boolean;
}

/**
 * Block 验证规则
 */
export interface BlockValidationRules {
  minContentLength?: number;
  maxContentLength?: number;
  allowEmptyContent?: boolean;
  validateParentExists?: boolean;
  validateSiblingChain?: boolean;
}

/**
 * Block 服务类
 */
export class BlockService {
  private api: BlockApi;
  private config: BlockServiceConfig;
  private validationRules: BlockValidationRules;

  constructor(
    config: BlockServiceConfig = {},
    validationRules: BlockValidationRules = {}
  ) {
    this.api = config.api || blockApi;
    this.config = {
      validateOnCreate: true,
      validateOnUpdate: true,
      autoGenerateIds: true,
      ...config
    };
    this.validationRules = {
      minContentLength: 0,
      maxContentLength: 10000,
      allowEmptyContent: true,
      validateParentExists: false,
      validateSiblingChain: false,
      ...validationRules
    };
  }

  /**
   * 验证 block 内容
   */
  private validateBlockContent(content: string): void {
    const { minContentLength, maxContentLength, allowEmptyContent } = this.validationRules;

    if (!allowEmptyContent && content.trim().length === 0) {
      throw new BlockServiceError('Block content cannot be empty', 'EMPTY_CONTENT');
    }

    if (minContentLength && content.length < minContentLength) {
      throw new BlockServiceError(
        `Content too short (min: ${minContentLength})`,
        'CONTENT_TOO_SHORT'
      );
    }

    if (maxContentLength && content.length > maxContentLength) {
      throw new BlockServiceError(
        `Content too long (max: ${maxContentLength})`,
        'CONTENT_TOO_LONG'
      );
    }
  }

  /**
   * 验证 block 关系
   */
  private async validateBlockRelations(
    parentId?: string | null,
    prevId?: string | null,
    nextId?: string | null
  ): Promise<void> {
    const { validateParentExists, validateSiblingChain } = this.validationRules;

    // 验证父块存在
    if (validateParentExists && parentId) {
      try {
        await this.api.getBlock(parentId);
      } catch (error) {
        if (error instanceof BlockApiError && error.status === 404) {
          throw new BlockServiceError(
            `Parent block not found: ${parentId}`,
            'PARENT_NOT_FOUND',
            error
          );
        }
        throw error;
      }
    }

    // 验证兄弟链
    if (validateSiblingChain) {
      if (prevId) {
        try {
          const prevBlock = await this.api.getBlock(prevId);
          if (prevBlock.parent_id !== parentId) {
            throw new BlockServiceError(
              'Previous sibling has different parent',
              'INVALID_SIBLING_CHAIN'
            );
          }
        } catch (error) {
          if (error instanceof BlockApiError && error.status === 404) {
            throw new BlockServiceError(
              `Previous sibling not found: ${prevId}`,
              'PREV_SIBLING_NOT_FOUND',
              error
            );
          }
          throw error;
        }
      }

      if (nextId) {
        try {
          const nextBlock = await this.api.getBlock(nextId);
          if (nextBlock.parent_id !== parentId) {
            throw new BlockServiceError(
              'Next sibling has different parent',
              'INVALID_SIBLING_CHAIN'
            );
          }
        } catch (error) {
          if (error instanceof BlockApiError && error.status === 404) {
            throw new BlockServiceError(
              `Next sibling not found: ${nextId}`,
              'NEXT_SIBLING_NOT_FOUND',
              error
            );
          }
          throw error;
        }
      }
    }
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 列出 blocks
   */
  async listBlocks(params: ListBlocksParams = {}): Promise<BlockListResponse> {
    try {
      return await this.api.listBlocks(params);
    } catch (error) {
      if (error instanceof BlockApiError) {
        throw new BlockServiceError(
          `Failed to list blocks: ${error.message}`,
          'LIST_FAILED',
          error
        );
      }
      throw error;
    }
  }

  /**
   * 获取单个 block
   */
  async getBlock(blockId: string): Promise<BlockResponse> {
    if (!blockId) {
      throw new BlockServiceError('Block ID is required', 'MISSING_BLOCK_ID');
    }

    try {
      return await this.api.getBlock(blockId);
    } catch (error) {
      if (error instanceof BlockApiError) {
        if (error.status === 404) {
          throw new BlockServiceError(
            `Block not found: ${blockId}`,
            'BLOCK_NOT_FOUND',
            error
          );
        }
        throw new BlockServiceError(
          `Failed to get block: ${error.message}`,
          'GET_FAILED',
          error
        );
      }
      throw error;
    }
  }

  /**
   * 创建 block
   */
  async createBlock(request: CreateBlockRequest): Promise<BlockResponse> {
    try {
      // 验证内容
      if (this.config.validateOnCreate) {
        this.validateBlockContent(request.content);
        await this.validateBlockRelations(
          request.parent_id,
          request.prev_id,
          request.next_id
        );
      }

      // 自动生成 ID
      if (this.config.autoGenerateIds && !request.id) {
        request.id = this.generateId();
      }

      return await this.api.createBlock(request);
    } catch (error) {
      if (error instanceof BlockServiceError) {
        throw error;
      }
      if (error instanceof BlockApiError) {
        throw new BlockServiceError(
          `Failed to create block: ${error.message}`,
          'CREATE_FAILED',
          error
        );
      }
      throw error;
    }
  }

  /**
   * 更新 block
   */
  async updateBlock(
    blockId: string,
    request: UpdateBlockRequest
  ): Promise<BlockResponse> {
    if (!blockId) {
      throw new BlockServiceError('Block ID is required', 'MISSING_BLOCK_ID');
    }

    try {
      // 验证内容
      if (this.config.validateOnUpdate) {
        if (request.content !== undefined) {
          this.validateBlockContent(request.content);
        }
        await this.validateBlockRelations(
          request.parent_id,
          request.prev_id,
          request.next_id
        );
      }

      return await this.api.updateBlock(blockId, request);
    } catch (error) {
      if (error instanceof BlockServiceError) {
        throw error;
      }
      if (error instanceof BlockApiError) {
        if (error.status === 404) {
          throw new BlockServiceError(
            `Block not found: ${blockId}`,
            'BLOCK_NOT_FOUND',
            error
          );
        }
        throw new BlockServiceError(
          `Failed to update block: ${error.message}`,
          'UPDATE_FAILED',
          error
        );
      }
      throw error;
    }
  }

  /**
   * 替换 block
   */
  async replaceBlock(
    blockId: string,
    request: ReplaceBlockRequest
  ): Promise<BlockResponse> {
    if (!blockId) {
      throw new BlockServiceError('Block ID is required', 'MISSING_BLOCK_ID');
    }

    try {
      // 验证内容
      if (this.config.validateOnUpdate) {
        this.validateBlockContent(request.content);
        await this.validateBlockRelations(
          request.parent_id,
          request.prev_id,
          request.next_id
        );
      }

      return await this.api.replaceBlock(blockId, request);
    } catch (error) {
      if (error instanceof BlockServiceError) {
        throw error;
      }
      if (error instanceof BlockApiError) {
        if (error.status === 404) {
          throw new BlockServiceError(
            `Block not found: ${blockId}`,
            'BLOCK_NOT_FOUND',
            error
          );
        }
        throw new BlockServiceError(
          `Failed to replace block: ${error.message}`,
          'REPLACE_FAILED',
          error
        );
      }
      throw error;
    }
  }

  /**
   * 删除 block
   */
  async deleteBlock(blockId: string): Promise<DeleteBlockResponse> {
    if (!blockId) {
      throw new BlockServiceError('Block ID is required', 'MISSING_BLOCK_ID');
    }

    try {
      return await this.api.deleteBlock(blockId);
    } catch (error) {
      if (error instanceof BlockApiError) {
        if (error.status === 404) {
          throw new BlockServiceError(
            `Block not found: ${blockId}`,
            'BLOCK_NOT_FOUND',
            error
          );
        }
        throw new BlockServiceError(
          `Failed to delete block: ${error.message}`,
          'DELETE_FAILED',
          error
        );
      }
      throw error;
    }
  }

  /**
   * 获取子 blocks
   */
  async getBlockChildren(blockId: string): Promise<BlockChildrenResponse> {
    if (!blockId) {
      throw new BlockServiceError('Block ID is required', 'MISSING_BLOCK_ID');
    }

    try {
      return await this.api.getBlockChildren(blockId);
    } catch (error) {
      if (error instanceof BlockApiError) {
        if (error.status === 404) {
          throw new BlockServiceError(
            `Block not found: ${blockId}`,
            'BLOCK_NOT_FOUND',
            error
          );
        }
        throw new BlockServiceError(
          `Failed to get block children: ${error.message}`,
          'GET_CHILDREN_FAILED',
          error
        );
      }
      throw error;
    }
  }

  /**
   * 获取兄弟 blocks
   */
  async getBlockSiblings(blockId: string): Promise<BlockSiblingsResponse> {
    if (!blockId) {
      throw new BlockServiceError('Block ID is required', 'MISSING_BLOCK_ID');
    }

    try {
      return await this.api.getBlockSiblings(blockId);
    } catch (error) {
      if (error instanceof BlockApiError) {
        if (error.status === 404) {
          throw new BlockServiceError(
            `Block not found: ${blockId}`,
            'BLOCK_NOT_FOUND',
            error
          );
        }
        throw new BlockServiceError(
          `Failed to get block siblings: ${error.message}`,
          'GET_SIBLINGS_FAILED',
          error
        );
      }
      throw error;
    }
  }

  /**
   * 移动 block
   */
  async moveBlock(
    blockId: string,
    request: MoveBlockRequest
  ): Promise<MoveBlockResponse> {
    if (!blockId) {
      throw new BlockServiceError('Block ID is required', 'MISSING_BLOCK_ID');
    }

    try {
      // 验证移动关系
      if (this.config.validateOnUpdate) {
        await this.validateBlockRelations(
          request.parent_id,
          request.prev_id,
          request.next_id
        );
      }

      return await this.api.moveBlock(blockId, request);
    } catch (error) {
      if (error instanceof BlockServiceError) {
        throw error;
      }
      if (error instanceof BlockApiError) {
        if (error.status === 404) {
          throw new BlockServiceError(
            `Block not found: ${blockId}`,
            'BLOCK_NOT_FOUND',
            error
          );
        }
        throw new BlockServiceError(
          `Failed to move block: ${error.message}`,
          'MOVE_FAILED',
          error
        );
      }
      throw error;
    }
  }

  /**
   * 获取完整的 block 树
   */
  async getBlockTree(rootId?: string): Promise<BlockResponse[]> {
    try {
      const response = await this.listBlocks({
        parent_id: rootId || undefined
      });
      
      // 递归获取所有子 blocks
      const blocks = response.blocks;
      const allBlocks: BlockResponse[] = [...blocks];

      for (const block of blocks) {
        if (block.first_child_id) {
          const childBlocks = await this.getBlockTree(block.id);
          allBlocks.push(...childBlocks);
        }
      }

      return allBlocks;
    } catch (error) {
      throw new BlockServiceError(
        `Failed to get block tree: ${error.message}`,
        'GET_TREE_FAILED',
        error
      );
    }
  }

  /**
   * 批量创建 blocks
   */
  async createBlocks(requests: CreateBlockRequest[]): Promise<BlockResponse[]> {
    const results: BlockResponse[] = [];
    const errors: Error[] = [];

    for (const request of requests) {
      try {
        const result = await this.createBlock(request);
        results.push(result);
      } catch (error) {
        errors.push(error);
      }
    }

    if (errors.length > 0) {
      throw new BlockServiceError(
        `Failed to create ${errors.length} out of ${requests.length} blocks`,
        'BATCH_CREATE_FAILED'
      );
    }

    return results;
  }

  /**
   * 更新服务配置
   */
  updateConfig(newConfig: Partial<BlockServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 更新验证规则
   */
  updateValidationRules(newRules: Partial<BlockValidationRules>): void {
    this.validationRules = { ...this.validationRules, ...newRules };
  }
}

/**
 * 默认 block 服务实例
 */
export const blockService = new BlockService();

/**
 * 创建自定义配置的 block 服务
 */
export function createBlockService(
  config?: BlockServiceConfig,
  validationRules?: BlockValidationRules
): BlockService {
  return new BlockService(config, validationRules);
} 