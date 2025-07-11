/**
 * Knowledge API 客户端
 * 与后端 FastAPI 通信的封装层
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
  ExportKnowledgeParams,
  ApiError
} from '../model/knowledge.model';

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
 * Knowledge API 错误类
 */
export class KnowledgeApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'KnowledgeApiError';
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
    const url = `${this.config.baseUrl}/api/knowledges${endpoint}`;
    
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

        throw new KnowledgeApiError(errorMessage, response.status, response);
      }

      // 对于特殊的响应类型（如 Markdown 导出），直接返回文本
      if (response.headers.get('content-type')?.includes('text/markdown')) {
        return await response.text() as unknown as T;
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof KnowledgeApiError) {
        throw error;
      }
      
      if (error.name === 'AbortError') {
        throw new KnowledgeApiError('请求超时', 408);
      }
      
      throw new KnowledgeApiError(
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

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

/**
 * Knowledge API 客户端类
 */
export class KnowledgeApi {
  private client: HttpClient;

  constructor(config: Partial<ApiConfig> = {}) {
    this.client = new HttpClient(config);
  }

  /**
   * 列出所有知识文档
   */
  async listKnowledges(params: ListKnowledgesParams = {}): Promise<KnowledgeListResponse> {
    return this.client.get<KnowledgeListResponse>('/', params);
  }

  /**
   * 创建新的知识文档
   */
  async createKnowledge(request: CreateKnowledgeRequest): Promise<KnowledgeResponse> {
    return this.client.post<KnowledgeResponse>('/', request);
  }

  /**
   * 搜索知识文档
   */
  async searchKnowledges(query: string): Promise<KnowledgeSearchResponse> {
    return this.client.get<KnowledgeSearchResponse>('/search', { query });
  }

  /**
   * 获取单个知识文档的详细信息
   */
  async getKnowledge(knowledgeId: string): Promise<KnowledgeResponse> {
    return this.client.get<KnowledgeResponse>(`/${knowledgeId}`);
  }

  /**
   * 更新知识文档的元数据
   */
  async updateKnowledgeMetadata(
    knowledgeId: string,
    request: UpdateKnowledgeMetadataRequest
  ): Promise<KnowledgeResponse> {
    return this.client.patch<KnowledgeResponse>(`/${knowledgeId}`, request);
  }

  /**
   * 删除知识文档
   */
  async deleteKnowledge(knowledgeId: string): Promise<DeleteKnowledgeResponse> {
    return this.client.delete<DeleteKnowledgeResponse>(`/${knowledgeId}`);
  }

  /**
   * 导出知识文档为 Markdown 格式
   */
  async exportKnowledgeToMarkdown(
    knowledgeId: string,
    params: ExportKnowledgeParams = {}
  ): Promise<string> {
    return this.client.post<string>(`/${knowledgeId}/export`, params);
  }

  /**
   * 获取知识文档的反向引用列表
   */
  async getKnowledgeBacklinks(knowledgeId: string): Promise<KnowledgeBacklinksResponse> {
    return this.client.get<KnowledgeBacklinksResponse>(`/${knowledgeId}/backlinks`);
  }

  /**
   * 将 block 链接到知识文档
   */
  async linkBlockToKnowledge(
    knowledgeId: string,
    request: LinkBlockToKnowledgeRequest
  ): Promise<LinkBlockToKnowledgeResponse> {
    return this.client.post<LinkBlockToKnowledgeResponse>(
      `/${knowledgeId}/link-block`,
      request
    );
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
export const knowledgeApi = new KnowledgeApi();

/**
 * 创建自定义配置的 API 客户端
 */
export function createKnowledgeApi(config: Partial<ApiConfig>): KnowledgeApi {
  return new KnowledgeApi(config);
} 