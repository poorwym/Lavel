/**
 * Knowledge 核心业务逻辑服务
 * 封装 knowledge 相关的业务操作，提供高级 API 给命令系统使用
 */

import {
  KnowledgeResponse,
  KnowledgeListResponse,
  KnowledgeBacklinksResponse,
  KnowledgeSearchResponse,
  CreateKnowledgeRequest,
  UpdateKnowledgeMetadataRequest,
  LinkBlockToKnowledgeRequest,
  LinkBlockToKnowledgeResponse,
  DeleteKnowledgeResponse,
  ListKnowledgesParams,
  ExportKnowledgeParams
} from '../model/knowledge.model';

import { KnowledgeApi, KnowledgeApiError, knowledgeApi } from '../api/knowledge.api';

/**
 * 服务错误类
 */
export class KnowledgeServiceError extends Error {
  constructor(
    message: string,
    public code?: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'KnowledgeServiceError';
  }
}

/**
 * Knowledge 服务配置
 */
export interface KnowledgeServiceConfig {
  api?: KnowledgeApi;
  validateOnCreate?: boolean;
  validateOnUpdate?: boolean;
  autoGenerateIds?: boolean;
}

/**
 * Knowledge 验证规则
 */
export interface KnowledgeValidationRules {
  minTitleLength?: number;
  maxTitleLength?: number;
  maxDescriptionLength?: number;
  allowEmptyTitle?: boolean;
  maxLinkedBlocks?: number;
  validateTagFormat?: boolean;
}

/**
 * Knowledge 服务类
 */
export class KnowledgeService {
  private api: KnowledgeApi;
  private config: KnowledgeServiceConfig;
  private validationRules: KnowledgeValidationRules;

  constructor(
    config: KnowledgeServiceConfig = {},
    validationRules: KnowledgeValidationRules = {}
  ) {
    this.api = config.api || knowledgeApi;
    this.config = {
      validateOnCreate: true,
      validateOnUpdate: true,
      autoGenerateIds: true,
      ...config
    };
    this.validationRules = {
      minTitleLength: 1,
      maxTitleLength: 200,
      maxDescriptionLength: 1000,
      allowEmptyTitle: false,
      maxLinkedBlocks: 100,
      validateTagFormat: true,
      ...validationRules
    };
  }

  /**
   * 验证 knowledge 标题
   */
  private validateKnowledgeTitle(title: string): void {
    const { minTitleLength, maxTitleLength, allowEmptyTitle } = this.validationRules;

    if (!allowEmptyTitle && title.trim().length === 0) {
      throw new KnowledgeServiceError('Knowledge title cannot be empty', 'EMPTY_TITLE');
    }

    if (minTitleLength && title.length < minTitleLength) {
      throw new KnowledgeServiceError(
        `Title too short (min: ${minTitleLength})`,
        'TITLE_TOO_SHORT'
      );
    }

    if (maxTitleLength && title.length > maxTitleLength) {
      throw new KnowledgeServiceError(
        `Title too long (max: ${maxTitleLength})`,
        'TITLE_TOO_LONG'
      );
    }
  }

  /**
   * 验证 knowledge 描述
   */
  private validateKnowledgeDescription(description?: string): void {
    const { maxDescriptionLength } = this.validationRules;

    if (description && maxDescriptionLength && description.length > maxDescriptionLength) {
      throw new KnowledgeServiceError(
        `Description too long (max: ${maxDescriptionLength})`,
        'DESCRIPTION_TOO_LONG'
      );
    }
  }

  /**
   * 验证标签格式
   */
  private validateTags(tags?: string[]): void {
    if (!this.validationRules.validateTagFormat || !tags) return;

    const tagPattern = /^[a-zA-Z0-9_\-\u4e00-\u9fa5]+$/;
    
    for (const tag of tags) {
      if (!tagPattern.test(tag)) {
        throw new KnowledgeServiceError(
          `Invalid tag format: ${tag}`,
          'INVALID_TAG_FORMAT'
        );
      }
    }
  }

  /**
   * 验证链接的 blocks
   */
  private validateLinkedBlocks(linkedBlocks?: string[]): void {
    const { maxLinkedBlocks } = this.validationRules;

    if (linkedBlocks && maxLinkedBlocks && linkedBlocks.length > maxLinkedBlocks) {
      throw new KnowledgeServiceError(
        `Too many linked blocks (max: ${maxLinkedBlocks})`,
        'TOO_MANY_LINKED_BLOCKS'
      );
    }
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `knowledge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 列出 knowledges
   */
  async listKnowledges(params: ListKnowledgesParams = {}): Promise<KnowledgeListResponse> {
    try {
      return await this.api.listKnowledges(params);
    } catch (error) {
      if (error instanceof KnowledgeApiError) {
        throw new KnowledgeServiceError(
          `Failed to list knowledges: ${error.message}`,
          'LIST_FAILED',
          error
        );
      }
      throw error;
    }
  }

  /**
   * 搜索 knowledges
   */
  async searchKnowledges(query: string): Promise<KnowledgeSearchResponse> {
    if (!query || query.trim().length === 0) {
      throw new KnowledgeServiceError('Search query is required', 'MISSING_QUERY');
    }

    try {
      return await this.api.searchKnowledges(query.trim());
    } catch (error) {
      if (error instanceof KnowledgeApiError) {
        throw new KnowledgeServiceError(
          `Failed to search knowledges: ${error.message}`,
          'SEARCH_FAILED',
          error
        );
      }
      throw error;
    }
  }

  /**
   * 获取单个 knowledge
   */
  async getKnowledge(knowledgeId: string): Promise<KnowledgeResponse> {
    if (!knowledgeId) {
      throw new KnowledgeServiceError('Knowledge ID is required', 'MISSING_KNOWLEDGE_ID');
    }

    try {
      return await this.api.getKnowledge(knowledgeId);
    } catch (error) {
      if (error instanceof KnowledgeApiError) {
        if (error.status === 404) {
          throw new KnowledgeServiceError(
            `Knowledge not found: ${knowledgeId}`,
            'KNOWLEDGE_NOT_FOUND',
            error
          );
        }
        throw new KnowledgeServiceError(
          `Failed to get knowledge: ${error.message}`,
          'GET_FAILED',
          error
        );
      }
      throw error;
    }
  }

  /**
   * 创建 knowledge
   */
  async createKnowledge(request: CreateKnowledgeRequest): Promise<KnowledgeResponse> {
    try {
      // 验证输入
      if (this.config.validateOnCreate) {
        this.validateKnowledgeTitle(request.title);
        this.validateKnowledgeDescription(request.description);
        this.validateTags(request.tags);
        this.validateLinkedBlocks(request.linked_blocks);
      }

      // 自动生成 ID
      if (this.config.autoGenerateIds && !request.id) {
        request.id = this.generateId();
      }

      return await this.api.createKnowledge(request);
    } catch (error) {
      if (error instanceof KnowledgeServiceError) {
        throw error;
      }
      if (error instanceof KnowledgeApiError) {
        throw new KnowledgeServiceError(
          `Failed to create knowledge: ${error.message}`,
          'CREATE_FAILED',
          error
        );
      }
      throw error;
    }
  }

  /**
   * 更新 knowledge 元数据
   */
  async updateKnowledgeMetadata(
    knowledgeId: string,
    request: UpdateKnowledgeMetadataRequest
  ): Promise<KnowledgeResponse> {
    if (!knowledgeId) {
      throw new KnowledgeServiceError('Knowledge ID is required', 'MISSING_KNOWLEDGE_ID');
    }

    try {
      // 验证输入
      if (this.config.validateOnUpdate) {
        if (request.title !== undefined) {
          this.validateKnowledgeTitle(request.title);
        }
        if (request.description !== undefined) {
          this.validateKnowledgeDescription(request.description);
        }
        this.validateTags(request.tags);
        this.validateLinkedBlocks(request.linked_blocks);
      }

      return await this.api.updateKnowledgeMetadata(knowledgeId, request);
    } catch (error) {
      if (error instanceof KnowledgeServiceError) {
        throw error;
      }
      if (error instanceof KnowledgeApiError) {
        if (error.status === 404) {
          throw new KnowledgeServiceError(
            `Knowledge not found: ${knowledgeId}`,
            'KNOWLEDGE_NOT_FOUND',
            error
          );
        }
        throw new KnowledgeServiceError(
          `Failed to update knowledge: ${error.message}`,
          'UPDATE_FAILED',
          error
        );
      }
      throw error;
    }
  }

  /**
   * 删除 knowledge
   */
  async deleteKnowledge(knowledgeId: string): Promise<DeleteKnowledgeResponse> {
    if (!knowledgeId) {
      throw new KnowledgeServiceError('Knowledge ID is required', 'MISSING_KNOWLEDGE_ID');
    }

    try {
      return await this.api.deleteKnowledge(knowledgeId);
    } catch (error) {
      if (error instanceof KnowledgeApiError) {
        if (error.status === 404) {
          throw new KnowledgeServiceError(
            `Knowledge not found: ${knowledgeId}`,
            'KNOWLEDGE_NOT_FOUND',
            error
          );
        }
        throw new KnowledgeServiceError(
          `Failed to delete knowledge: ${error.message}`,
          'DELETE_FAILED',
          error
        );
      }
      throw error;
    }
  }

  /**
   * 导出 knowledge 为 Markdown
   */
  async exportKnowledgeToMarkdown(
    knowledgeId: string,
    params: ExportKnowledgeParams = {}
  ): Promise<string> {
    if (!knowledgeId) {
      throw new KnowledgeServiceError('Knowledge ID is required', 'MISSING_KNOWLEDGE_ID');
    }

    try {
      return await this.api.exportKnowledgeToMarkdown(knowledgeId, params);
    } catch (error) {
      if (error instanceof KnowledgeApiError) {
        if (error.status === 404) {
          throw new KnowledgeServiceError(
            `Knowledge not found: ${knowledgeId}`,
            'KNOWLEDGE_NOT_FOUND',
            error
          );
        }
        throw new KnowledgeServiceError(
          `Failed to export knowledge: ${error.message}`,
          'EXPORT_FAILED',
          error
        );
      }
      throw error;
    }
  }

  /**
   * 获取反向链接
   */
  async getKnowledgeBacklinks(knowledgeId: string): Promise<KnowledgeBacklinksResponse> {
    if (!knowledgeId) {
      throw new KnowledgeServiceError('Knowledge ID is required', 'MISSING_KNOWLEDGE_ID');
    }

    try {
      return await this.api.getKnowledgeBacklinks(knowledgeId);
    } catch (error) {
      if (error instanceof KnowledgeApiError) {
        if (error.status === 404) {
          throw new KnowledgeServiceError(
            `Knowledge not found: ${knowledgeId}`,
            'KNOWLEDGE_NOT_FOUND',
            error
          );
        }
        throw new KnowledgeServiceError(
          `Failed to get knowledge backlinks: ${error.message}`,
          'GET_BACKLINKS_FAILED',
          error
        );
      }
      throw error;
    }
  }

  /**
   * 链接 block 到 knowledge
   */
  async linkBlockToKnowledge(
    knowledgeId: string,
    request: LinkBlockToKnowledgeRequest
  ): Promise<LinkBlockToKnowledgeResponse> {
    if (!knowledgeId) {
      throw new KnowledgeServiceError('Knowledge ID is required', 'MISSING_KNOWLEDGE_ID');
    }

    if (!request.block_id) {
      throw new KnowledgeServiceError('Block ID is required', 'MISSING_BLOCK_ID');
    }

    try {
      return await this.api.linkBlockToKnowledge(knowledgeId, request);
    } catch (error) {
      if (error instanceof KnowledgeApiError) {
        if (error.status === 404) {
          throw new KnowledgeServiceError(
            `Knowledge or block not found`,
            'RESOURCE_NOT_FOUND',
            error
          );
        }
        throw new KnowledgeServiceError(
          `Failed to link block to knowledge: ${error.message}`,
          'LINK_FAILED',
          error
        );
      }
      throw error;
    }
  }

  /**
   * 批量创建 knowledges
   */
  async createKnowledges(requests: CreateKnowledgeRequest[]): Promise<KnowledgeResponse[]> {
    const results: KnowledgeResponse[] = [];
    const errors: Error[] = [];

    for (const request of requests) {
      try {
        const result = await this.createKnowledge(request);
        results.push(result);
      } catch (error) {
        errors.push(error);
      }
    }

    if (errors.length > 0) {
      throw new KnowledgeServiceError(
        `Failed to create ${errors.length} out of ${requests.length} knowledges`,
        'BATCH_CREATE_FAILED'
      );
    }

    return results;
  }

  /**
   * 根据标签筛选 knowledges
   */
  async getKnowledgesByTags(tags: string[]): Promise<KnowledgeResponse[]> {
    if (!tags || tags.length === 0) {
      throw new KnowledgeServiceError('Tags are required', 'MISSING_TAGS');
    }

    try {
      const response = await this.listKnowledges({
        tags: tags.join(',')
      });
      return response.knowledges;
    } catch (error) {
      throw new KnowledgeServiceError(
        `Failed to get knowledges by tags: ${error.message}`,
        'GET_BY_TAGS_FAILED',
        error
      );
    }
  }

  /**
   * 更新服务配置
   */
  updateConfig(newConfig: Partial<KnowledgeServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 更新验证规则
   */
  updateValidationRules(newRules: Partial<KnowledgeValidationRules>): void {
    this.validationRules = { ...this.validationRules, ...newRules };
  }
}

/**
 * 默认 knowledge 服务实例
 */
export const knowledgeService = new KnowledgeService();

/**
 * 创建自定义配置的 knowledge 服务
 */
export function createKnowledgeService(
  config?: KnowledgeServiceConfig,
  validationRules?: KnowledgeValidationRules
): KnowledgeService {
  return new KnowledgeService(config, validationRules);
} 