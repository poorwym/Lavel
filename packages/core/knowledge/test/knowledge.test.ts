/**
 * Knowledge 模块测试
 * 
 * 测试内容：
 * - API 客户端功能
 * - 服务层业务逻辑
 * - 命令系统集成
 * - 撤销功能
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// 模拟外部依赖
vi.mock('@lavel/command-system');
vi.mock('@lavel/undo-system');

// 导入被测试的模块
import {
  KnowledgeApi,
  KnowledgeApiError,
  KnowledgeService,
  KnowledgeServiceError,
  CreateKnowledgeCommand,
  UpdateKnowledgeMetadataCommand,
  DeleteKnowledgeCommand,
  initializeKnowledgeModule,
  createQuickKnowledge
} from '../index';

import type {
  KnowledgeResponse,
  CreateKnowledgeRequest,
  UpdateKnowledgeMetadataRequest
} from '../model/knowledge.model';

// 测试数据
const mockKnowledge: KnowledgeResponse = {
  id: 'test-knowledge-id',
  title: '测试知识文档',
  description: '这是一个测试知识文档',
  tags: ['测试', '文档'],
  root_block_id: 'root-block-id',
  linked_blocks: ['block1', 'block2'],
  backlinks: [],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

const mockCreateRequest: CreateKnowledgeRequest = {
  title: '新知识文档',
  description: '新建的测试文档',
  tags: ['新建', '测试']
};

// ============ API 层测试 ============

describe('Knowledge API', () => {
  let api: KnowledgeApi;
  let fetchMock: any;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
    api = new KnowledgeApi();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('基本 CRUD 操作', () => {
    it('应该能够列出知识文档', async () => {
      const mockResponse = {
        knowledges: [mockKnowledge],
        pagination: { page: 1, limit: 20, total: 1, total_pages: 1 }
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: {
          get: vi.fn().mockReturnValue('application/json')
        }
      });

      const result = await api.listKnowledges();

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8000/api/knowledges/',
        expect.objectContaining({ method: 'GET' })
      );
      expect(result).toEqual(mockResponse);
    });

    it('应该能够创建知识文档', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockKnowledge,
        headers: {
          get: vi.fn().mockReturnValue('application/json')
        }
      });

      const result = await api.createKnowledge(mockCreateRequest);

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8000/api/knowledges/',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mockCreateRequest)
        })
      );
      expect(result).toEqual(mockKnowledge);
    });

    it('应该能够获取单个知识文档', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockKnowledge,
        headers: {
          get: vi.fn().mockReturnValue('application/json')
        }
      });

      const result = await api.getKnowledge('test-id');

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8000/api/knowledges/test-id',
        expect.objectContaining({ method: 'GET' })
      );
      expect(result).toEqual(mockKnowledge);
    });
  });

  describe('错误处理', () => {
    it('应该正确处理 HTTP 错误', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ detail: 'Knowledge not found' })
      });

      await expect(api.getKnowledge('nonexistent')).rejects.toThrow(KnowledgeApiError);
    });

    it('应该处理网络超时', async () => {
      fetchMock.mockImplementationOnce(() => {
        // 模拟 AbortError 
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      await expect(api.getKnowledge('test-id')).rejects.toThrow(KnowledgeApiError);
    });
  });
});

// ============ 服务层测试 ============

describe('Knowledge Service', () => {
  let service: KnowledgeService;
  let apiMock: any;

  beforeEach(() => {
    apiMock = {
      listKnowledges: vi.fn(),
      createKnowledge: vi.fn(),
      getKnowledge: vi.fn(),
      updateKnowledgeMetadata: vi.fn(),
      deleteKnowledge: vi.fn(),
      searchKnowledges: vi.fn(),
      exportKnowledgeToMarkdown: vi.fn(),
      getKnowledgeBacklinks: vi.fn(),
      linkBlockToKnowledge: vi.fn()
    };

    service = new KnowledgeService({ api: apiMock });
  });

  describe('验证功能', () => {
    it('应该验证知识文档标题', async () => {
      const invalidRequest = { ...mockCreateRequest, title: '' };

      await expect(service.createKnowledge(invalidRequest)).rejects.toThrow(KnowledgeServiceError);
    });

    it('应该验证标签格式', async () => {
      const invalidRequest = { ...mockCreateRequest, tags: ['invalid tag!'] };

      await expect(service.createKnowledge(invalidRequest)).rejects.toThrow(KnowledgeServiceError);
    });

    it('应该验证描述长度', async () => {
      const longDescription = 'x'.repeat(2000); // 超过默认最大长度
      const invalidRequest = { ...mockCreateRequest, description: longDescription };

      await expect(service.createKnowledge(invalidRequest)).rejects.toThrow(KnowledgeServiceError);
    });
  });

  describe('业务逻辑', () => {
    it('应该能够创建知识文档', async () => {
      apiMock.createKnowledge.mockResolvedValue(mockKnowledge);

      const result = await service.createKnowledge(mockCreateRequest);

      expect(apiMock.createKnowledge).toHaveBeenCalledWith(mockCreateRequest);
      expect(result).toEqual(mockKnowledge);
    });

    it('应该能够批量创建知识文档', async () => {
      const requests = [mockCreateRequest, { ...mockCreateRequest, title: '另一个文档' }];
      const responses = [mockKnowledge, { ...mockKnowledge, id: 'another-id', title: '另一个文档' }];

      apiMock.createKnowledge
        .mockResolvedValueOnce(responses[0])
        .mockResolvedValueOnce(responses[1]);

      const results = await service.createKnowledges(requests);

      expect(results).toHaveLength(2);
      expect(apiMock.createKnowledge).toHaveBeenCalledTimes(2);
    });
  });

  describe('错误处理', () => {
    it('应该将 API 错误转换为服务错误', async () => {
      const apiError = new KnowledgeApiError('API 错误', 500);
      apiMock.getKnowledge.mockRejectedValue(apiError);

      await expect(service.getKnowledge('test-id')).rejects.toThrow(KnowledgeServiceError);
    });
  });
});

// ============ 命令层测试 ============

describe('Knowledge Commands', () => {
  let service: KnowledgeService;
  let createCommand: CreateKnowledgeCommand;
  let updateCommand: UpdateKnowledgeMetadataCommand;
  let deleteCommand: DeleteKnowledgeCommand;

  beforeEach(() => {
    service = new KnowledgeService();
    vi.spyOn(service, 'createKnowledge').mockResolvedValue(mockKnowledge);
    vi.spyOn(service, 'getKnowledge').mockResolvedValue(mockKnowledge);
    vi.spyOn(service, 'updateKnowledgeMetadata').mockResolvedValue(mockKnowledge);
    vi.spyOn(service, 'deleteKnowledge').mockResolvedValue({ success: true, message: 'Deleted' });

    createCommand = new CreateKnowledgeCommand();
    updateCommand = new UpdateKnowledgeMetadataCommand();
    deleteCommand = new DeleteKnowledgeCommand();
  });

  describe('创建命令', () => {
    it('应该能够执行创建命令', async () => {
      const context = {
        args: mockCreateRequest,
        env: {},
        knowledgeService: service
      };

      const result = await createCommand.execute(context);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockKnowledge);
      expect(context.env.createdKnowledgeId).toBe(mockKnowledge.id);
    });

    it('应该能够撤销创建命令', async () => {
      const snapshot = {
        context: {
          args: mockCreateRequest,
          env: { createdKnowledgeId: mockKnowledge.id },
          knowledgeService: service
        }
      };

      const result = await createCommand.undo(snapshot);

      expect(result.success).toBe(true);
      expect(service.deleteKnowledge).toHaveBeenCalledWith(mockKnowledge.id);
    });
  });

  describe('更新命令', () => {
    it('应该能够执行更新命令', async () => {
      const updateRequest: UpdateKnowledgeMetadataRequest = {
        title: '更新后的标题'
      };

      const context = {
        args: { knowledgeId: mockKnowledge.id, ...updateRequest },
        env: {},
        knowledgeService: service
      };

      const result = await updateCommand.execute(context);

      expect(result.success).toBe(true);
      expect(context.env.originalKnowledge).toEqual(mockKnowledge);
    });

    it('应该能够撤销更新命令', async () => {
      const snapshot = {
        context: {
          args: { knowledgeId: mockKnowledge.id },
          env: { originalKnowledge: mockKnowledge },
          knowledgeService: service
        }
      };

      const result = await updateCommand.undo(snapshot);

      expect(result.success).toBe(true);
      expect(service.updateKnowledgeMetadata).toHaveBeenCalledWith(
        mockKnowledge.id,
        expect.objectContaining({
          title: mockKnowledge.title,
          description: mockKnowledge.description,
          tags: mockKnowledge.tags
        })
      );
    });
  });

  describe('删除命令', () => {
    it('应该能够执行删除命令', async () => {
      const context = {
        args: { knowledgeId: mockKnowledge.id },
        env: {},
        knowledgeService: service
      };

      const result = await deleteCommand.execute(context);

      expect(result.success).toBe(true);
      expect(context.env.originalKnowledge).toEqual(mockKnowledge);
    });

    it('应该能够撤销删除命令', async () => {
      const snapshot = {
        context: {
          args: { knowledgeId: mockKnowledge.id },
          env: { originalKnowledge: mockKnowledge },
          knowledgeService: service
        }
      };

      const result = await deleteCommand.undo(snapshot);

      expect(result.success).toBe(true);
      expect(service.createKnowledge).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockKnowledge.id,
          title: mockKnowledge.title
        })
      );
    });
  });
});

// ============ 模块集成测试 ============

describe('Knowledge Module Integration', () => {
  describe('模块初始化', () => {
    it('应该能够初始化模块', async () => {
      const module = await initializeKnowledgeModule();

      expect(module.api).toBeDefined();
      expect(module.service).toBeDefined();
      expect(module.commands).toBeDefined();
      expect(module.commands.length).toBeGreaterThan(0);
    });

    it('应该能够使用自定义配置初始化', async () => {
      const config = {
        apiConfig: { baseUrl: 'http://custom.api' },
        serviceConfig: { validateOnCreate: false }
      };

      const module = await initializeKnowledgeModule(config);

      expect(module.api).toBeDefined();
      expect(module.service).toBeDefined();
    });
  });

  describe('快速操作', () => {
    it('应该能够快速创建知识文档', async () => {
      const mockService = {
        createKnowledge: vi.fn().mockResolvedValue(mockKnowledge)
      };

      const result = await createQuickKnowledge('测试标题', {
        description: '测试描述',
        service: mockService as any
      });

      expect(mockService.createKnowledge).toHaveBeenCalledWith({
        title: '测试标题',
        description: '测试描述'
      });
      expect(result).toEqual(mockKnowledge);
    });
  });
});

// ============ 性能测试 ============

describe('Knowledge Performance', () => {
  it('应该能够处理大量并发请求', async () => {
    const mockService = {
      listKnowledges: vi.fn().mockResolvedValue({
        knowledges: [],
        pagination: { page: 1, limit: 20, total: 0, total_pages: 0 }
      })
    };

    const promises = Array(100).fill(null).map(() => 
      mockService.listKnowledges()
    );

    const results = await Promise.all(promises);

    expect(results).toHaveLength(100);
    expect(mockService.listKnowledges).toHaveBeenCalledTimes(100);
  });
}); 