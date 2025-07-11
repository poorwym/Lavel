/**
 * Block API 客户端
 * 与后端 FastAPI 通信的封装层
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
  ListBlocksParams,
  ApiError
} from '../model/block.model';

/**
 * API 客户端配置
 */
export interface ApiConfig {
  baseUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: ApiConfig = {
  baseUrl: 'http://localhost:8000',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  }
};

/**
 * Block API 错误类
 */
export class BlockApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'BlockApiError';
  }
}

/**
 * HTTP 客户端封装
 */
class HttpClient {
  private config: ApiConfig;

  constructor(config: Partial<ApiConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.baseUrl}/api/blocks${endpoint}`;
    
    const requestOptions: RequestInit = {
      ...options,
      headers: {
        ...this.config.headers,
        ...options.headers,
      },
    };

    // 添加超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, this.config.timeout);

    try {
      const response = await fetch(url, {
        ...requestOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const errorData: ApiError = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch {
          // 如果无法解析错误响应，使用默认错误消息
        }

        throw new BlockApiError(errorMessage, response.status, response);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof BlockApiError) {
        throw error;
      }
      
      if (error.name === 'AbortError') {
        throw new BlockApiError('请求超时', 408);
      }
      
      throw new BlockApiError(
        error.message || '网络请求失败',
        0,
        error
      );
    }
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    return this.request<T>(url, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

/**
 * Block API 客户端类
 */
export class BlockApi {
  private client: HttpClient;

  constructor(config: Partial<ApiConfig> = {}) {
    this.client = new HttpClient(config);
  }

  /**
   * 列出所有blocks
   */
  async listBlocks(params: ListBlocksParams = {}): Promise<BlockListResponse> {
    return this.client.get<BlockListResponse>('/', params);
  }

  /**
   * 创建新的block
   */
  async createBlock(request: CreateBlockRequest): Promise<BlockResponse> {
    return this.client.post<BlockResponse>('/', request);
  }

  /**
   * 获取单个block的详细信息
   */
  async getBlock(blockId: string): Promise<BlockResponse> {
    return this.client.get<BlockResponse>(`/${blockId}`);
  }

  /**
   * 部分更新block
   */
  async updateBlock(
    blockId: string,
    request: UpdateBlockRequest
  ): Promise<BlockResponse> {
    return this.client.patch<BlockResponse>(`/${blockId}`, request);
  }

  /**
   * 完全替换block
   */
  async replaceBlock(
    blockId: string,
    request: ReplaceBlockRequest
  ): Promise<BlockResponse> {
    return this.client.put<BlockResponse>(`/${blockId}`, request);
  }

  /**
   * 删除block
   */
  async deleteBlock(blockId: string): Promise<DeleteBlockResponse> {
    return this.client.delete<DeleteBlockResponse>(`/${blockId}`);
  }

  /**
   * 获取指定block的所有子块
   */
  async getBlockChildren(blockId: string): Promise<BlockChildrenResponse> {
    return this.client.get<BlockChildrenResponse>(`/${blockId}/children`);
  }

  /**
   * 获取指定block的所有兄弟块
   */
  async getBlockSiblings(blockId: string): Promise<BlockSiblingsResponse> {
    return this.client.get<BlockSiblingsResponse>(`/${blockId}/siblings`);
  }

  /**
   * 移动block位置
   */
  async moveBlock(
    blockId: string,
    request: MoveBlockRequest
  ): Promise<MoveBlockResponse> {
    return this.client.post<MoveBlockResponse>(`/${blockId}/move`, request);
  }

  /**
   * 更新 API 配置
   */
  updateConfig(newConfig: Partial<ApiConfig>): void {
    this.client = new HttpClient({ ...this.client['config'], ...newConfig });
  }
}

/**
 * 默认 API 客户端实例
 */
export const blockApi = new BlockApi();

/**
 * 创建自定义配置的 API 客户端
 */
export function createBlockApi(config: Partial<ApiConfig>): BlockApi {
  return new BlockApi(config);
} 