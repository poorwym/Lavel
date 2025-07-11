/**
 * Block 模块单元测试
 * 测试 API、服务和命令层的功能
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';

// 模拟依赖
const mockFetch = vi.fn();
global.fetch = mockFetch;

import {
  BlockApi,
  BlockApiError,
  createBlockApi
} from '../api/block.api';

import {
  BlockService,
  BlockServiceError,
  createBlockService
} from '../service/block.service';

import {
  CreateBlockCommand,
  UpdateBlockCommand,
  DeleteBlockCommand,
  MoveBlockCommand,
  ListBlocksCommand,
  GetBlockCommand,
  registerBlockCommands
} from '../command/block.commands';

import {
  BlockResponse,
  CreateBlockRequest,
  UpdateBlockRequest,
  MoveBlockRequest,
  ListBlocksParams
} from '../model/block.model';

// 测试数据
const mockBlock: BlockResponse = {
  id: 'test-block-1',
  content: 'Test block content',
  parent_id: null,
  prev_id: null,
  next_id: null,
  first_child_id: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

const mockCreateRequest: CreateBlockRequest = {
  content: 'New block content',
  parent_id: null
};

const mockUpdateRequest: UpdateBlockRequest = {
  content: 'Updated block content'
};

// ============ API 层测试 ============

describe('BlockApi', () => {
  let api: BlockApi;

  beforeEach(() => {
    api = createBlockApi({
      baseUrl: 'http://test-api.com',
      timeout: 1000
    });
    mockFetch.mockClear();
  });

  describe('listBlocks', () => {
    test('应该成功列出 blocks', async () => {
      const mockResponse = {
        blocks: [mockBlock],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          total_pages: 1
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const params: ListBlocksParams = { page: 1, limit: 20 };
      const result = await api.listBlocks(params);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://test-api.com/api/blocks/?page=1&limit=20',
        expect.objectContaining({
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
      );

      expect(result).toEqual(mockResponse);
    });

    test('应该处理 API 错误', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ detail: 'Server error' })
      });

      await expect(api.listBlocks()).rejects.toThrow(BlockApiError);
    });
  });

  describe('createBlock', () => {
    test('应该成功创建 block', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBlock
      });

      const result = await api.createBlock(mockCreateRequest);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://test-api.com/api/blocks/',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mockCreateRequest)
        })
      );

      expect(result).toEqual(mockBlock);
    });
  });

  describe('getBlock', () => {
    test('应该成功获取 block', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBlock
      });

      const result = await api.getBlock('test-block-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://test-api.com/api/blocks/test-block-1',
        expect.objectContaining({ method: 'GET' })
      );

      expect(result).toEqual(mockBlock);
    });

    test('应该处理 404 错误', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ detail: 'Block not found' })
      });

      await expect(api.getBlock('nonexistent')).rejects.toThrow(
        new BlockApiError('Block not found', 404)
      );
    });
  });

  describe('updateBlock', () => {
    test('应该成功更新 block', async () => {
      const updatedBlock = { ...mockBlock, content: 'Updated content' };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => updatedBlock
      });

      const result = await api.updateBlock('test-block-1', mockUpdateRequest);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://test-api.com/api/blocks/test-block-1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(mockUpdateRequest)
        })
      );

      expect(result).toEqual(updatedBlock);
    });
  });

  describe('deleteBlock', () => {
    test('应该成功删除 block', async () => {
      const deleteResponse = { success: true, message: 'Block deleted' };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => deleteResponse
      });

      const result = await api.deleteBlock('test-block-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://test-api.com/api/blocks/test-block-1',
        expect.objectContaining({ method: 'DELETE' })
      );

      expect(result).toEqual(deleteResponse);
    });
  });

  describe('moveBlock', () => {
    test('应该成功移动 block', async () => {
      const moveRequest: MoveBlockRequest = { parent_id: 'new-parent' };
      const moveResponse = {
        success: true,
        block: mockBlock,
        message: 'Block moved successfully'
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => moveResponse
      });

      const result = await api.moveBlock('test-block-1', moveRequest);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://test-api.com/api/blocks/test-block-1/move',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(moveRequest)
        })
      );

      expect(result).toEqual(moveResponse);
    });
  });

  describe('网络错误处理', () => {
    test('应该处理网络超时', async () => {
      mockFetch.mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('AbortError')), 2000)
        )
      );

      await expect(api.getBlock('test-block-1')).rejects.toThrow(BlockApiError);
    });

    test('应该处理网络连接失败', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(api.getBlock('test-block-1')).rejects.toThrow(BlockApiError);
    });
  });
});

// ============ 服务层测试 ============

describe('BlockService', () => {
  let service: BlockService;
  let mockApi: any;

  beforeEach(() => {
    mockApi = {
      listBlocks: vi.fn(),
      createBlock: vi.fn(),
      getBlock: vi.fn(),
      updateBlock: vi.fn(),
      replaceBlock: vi.fn(),
      deleteBlock: vi.fn(),
      getBlockChildren: vi.fn(),
      getBlockSiblings: vi.fn(),
      moveBlock: vi.fn(),
      updateConfig: vi.fn()
    } as any;

    service = createBlockService(
      { api: mockApi, validateOnCreate: true },
      { minContentLength: 1, maxContentLength: 1000 }
    );
  });

  describe('createBlock', () => {
    test('应该成功创建 block', async () => {
      mockApi.createBlock.mockResolvedValueOnce(mockBlock);

      const result = await service.createBlock(mockCreateRequest);

      expect(mockApi.createBlock).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockCreateRequest,
          id: expect.any(String) // 自动生成的 ID
        })
      );
      expect(result).toEqual(mockBlock);
    });

    test('应该验证内容长度', async () => {
      const invalidRequest = { ...mockCreateRequest, content: '' };

      await expect(service.createBlock(invalidRequest)).rejects.toThrow(
        BlockServiceError
      );
      expect(mockApi.createBlock).not.toHaveBeenCalled();
    });

    test('应该验证内容过长', async () => {
      const longContent = 'a'.repeat(1001);
      const invalidRequest = { ...mockCreateRequest, content: longContent };

      await expect(service.createBlock(invalidRequest)).rejects.toThrow(
        new BlockServiceError('Content too long (max: 1000)', 'CONTENT_TOO_LONG')
      );
    });

    test('应该处理 API 错误', async () => {
      mockApi.createBlock.mockRejectedValueOnce(
        new BlockApiError('Server error', 500)
      );

      await expect(service.createBlock(mockCreateRequest)).rejects.toThrow(
        BlockServiceError
      );
    });
  });

  describe('getBlock', () => {
    test('应该成功获取 block', async () => {
      mockApi.getBlock.mockResolvedValueOnce(mockBlock);

      const result = await service.getBlock('test-block-1');

      expect(mockApi.getBlock).toHaveBeenCalledWith('test-block-1');
      expect(result).toEqual(mockBlock);
    });

    test('应该验证 block ID', async () => {
      await expect(service.getBlock('')).rejects.toThrow(
        new BlockServiceError('Block ID is required', 'MISSING_BLOCK_ID')
      );
    });

    test('应该处理 block 不存在', async () => {
      mockApi.getBlock.mockRejectedValueOnce(
        new BlockApiError('Block not found', 404)
      );

      await expect(service.getBlock('nonexistent')).rejects.toThrow(
        new BlockServiceError('Block not found: nonexistent', 'BLOCK_NOT_FOUND')
      );
    });
  });

  describe('updateBlock', () => {
    test('应该成功更新 block', async () => {
      const updatedBlock = { ...mockBlock, content: 'Updated' };
      mockApi.updateBlock.mockResolvedValueOnce(updatedBlock);

      const result = await service.updateBlock('test-block-1', mockUpdateRequest);

      expect(mockApi.updateBlock).toHaveBeenCalledWith('test-block-1', mockUpdateRequest);
      expect(result).toEqual(updatedBlock);
    });

    test('应该验证更新内容', async () => {
      const invalidUpdate = { content: 'a'.repeat(1001) };

      await expect(service.updateBlock('test-block-1', invalidUpdate))
        .rejects.toThrow(BlockServiceError);
    });
  });

  describe('deleteBlock', () => {
    test('应该成功删除 block', async () => {
      const deleteResponse = { success: true, message: 'Block deleted' };
      mockApi.deleteBlock.mockResolvedValueOnce(deleteResponse);

      const result = await service.deleteBlock('test-block-1');

      expect(mockApi.deleteBlock).toHaveBeenCalledWith('test-block-1');
      expect(result).toEqual(deleteResponse);
    });
  });

  describe('getBlockTree', () => {
    test('应该成功获取 block 树', async () => {
      const parentBlock = { ...mockBlock, first_child_id: 'child-1' };
      const childBlock = { ...mockBlock, id: 'child-1', parent_id: 'test-block-1' };
      
      mockApi.listBlocks
        .mockResolvedValueOnce({
          blocks: [parentBlock],
          pagination: { page: 1, limit: 20, total: 1, total_pages: 1 }
        })
        .mockResolvedValueOnce({
          blocks: [childBlock],
          pagination: { page: 1, limit: 20, total: 1, total_pages: 1 }
        });

      const result = await service.getBlockTree();

      expect(result).toHaveLength(2);
      expect(result).toContain(parentBlock);
      expect(result).toContain(childBlock);
    });
  });

  describe('批量操作', () => {
    test('应该成功批量创建 blocks', async () => {
      const requests = [mockCreateRequest, { ...mockCreateRequest, content: 'Second block' }];
      const responses = [
        mockBlock,
        { ...mockBlock, id: 'test-block-2', content: 'Second block' }
      ];

      mockApi.createBlock
        .mockResolvedValueOnce(responses[0])
        .mockResolvedValueOnce(responses[1]);

      const results = await service.createBlocks(requests);

      expect(results).toEqual(responses);
      expect(mockApi.createBlock).toHaveBeenCalledTimes(2);
    });

    test('应该处理批量创建错误', async () => {
      const requests = [mockCreateRequest, mockCreateRequest];
      
      mockApi.createBlock
        .mockResolvedValueOnce(mockBlock)
        .mockRejectedValueOnce(new BlockApiError('Server error', 500));

      await expect(service.createBlocks(requests)).rejects.toThrow(
        new BlockServiceError('Failed to create 1 out of 2 blocks', 'BATCH_CREATE_FAILED')
      );
    });
  });
});

// ============ 命令层测试 ============

describe('Block Commands', () => {
  let mockService: any;

  beforeEach(() => {
    mockService = {
      listBlocks: vi.fn(),
      createBlock: vi.fn(),
      getBlock: vi.fn(),
      updateBlock: vi.fn(),
      replaceBlock: vi.fn(),
      deleteBlock: vi.fn(),
      getBlockChildren: vi.fn(),
      getBlockSiblings: vi.fn(),
      moveBlock: vi.fn(),
      getBlockTree: vi.fn(),
      createBlocks: vi.fn(),
      updateConfig: vi.fn(),
      updateValidationRules: vi.fn()
    } as any;
  });

  describe('ListBlocksCommand', () => {
    test('应该成功执行列表命令', async () => {
      const mockResponse = {
        blocks: [mockBlock],
        pagination: { page: 1, limit: 20, total: 1, total_pages: 1 }
      };
      
      mockService.listBlocks.mockResolvedValueOnce(mockResponse);

      const command = new ListBlocksCommand();
      const context = {
        args: { page: 1, limit: 20 },
        env: {},
        blockService: mockService
      };

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
      expect(mockService.listBlocks).toHaveBeenCalledWith({ page: 1, limit: 20 });
    });

    test('应该处理服务错误', async () => {
      mockService.listBlocks.mockRejectedValueOnce(
        new BlockServiceError('List failed', 'LIST_FAILED')
      );

      const command = new ListBlocksCommand();
      const context = {
        args: {},
        env: {},
        blockService: mockService
      };

      const result = await command.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Block 操作失败');
    });
  });

  describe('CreateBlockCommand', () => {
    test('应该成功执行创建命令', async () => {
      mockService.createBlock.mockResolvedValueOnce(mockBlock);

      const command = new CreateBlockCommand();
      const context = {
        args: mockCreateRequest,
        env: {} as any,
        blockService: mockService
      };

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockBlock);
      expect(context.env.createdBlockId).toBe(mockBlock.id);
      expect(mockService.createBlock).toHaveBeenCalledWith(mockCreateRequest);
    });

    test('应该成功撤销创建命令', async () => {
      const deleteResponse = { success: true, message: 'Block deleted' };
      mockService.deleteBlock.mockResolvedValueOnce(deleteResponse);

      const command = new CreateBlockCommand();
      const snapshot = {
        context: {
          args: mockCreateRequest,
          env: { createdBlockId: 'test-block-1' },
          blockService: mockService
        }
      } as any;

      const result = await command.undo(snapshot);

      expect(result.success).toBe(true);
      expect(result.data.message).toContain('已撤销创建');
    });

    test('撤销时应该处理缺少 block ID 的情况', async () => {
      const command = new CreateBlockCommand();
      const snapshot = {
        context: { args: mockCreateRequest, env: {} }
      } as any;

      const result = await command.undo(snapshot);

      expect(result.success).toBe(false);
      expect(result.error).toContain('缺少创建的 block ID');
    });
  });

  describe('UpdateBlockCommand', () => {
    test('应该成功执行更新命令', async () => {
      const updatedBlock = { ...mockBlock, content: 'Updated' };
      
      mockService.getBlock.mockResolvedValueOnce(mockBlock);
      mockService.updateBlock.mockResolvedValueOnce(updatedBlock);

      const command = new UpdateBlockCommand();
      const context = {
        args: { blockId: 'test-block-1', ...mockUpdateRequest },
        env: {} as any,
        blockService: mockService
      };

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedBlock);
      expect(context.env.originalBlock).toEqual(mockBlock);
    });

    test('应该成功撤销更新命令', async () => {
      mockService.updateBlock.mockResolvedValueOnce(mockBlock);

      const command = new UpdateBlockCommand();
      const snapshot = {
        context: {
          args: { blockId: 'test-block-1' },
          env: { originalBlock: mockBlock },
          blockService: mockService
        }
      } as any;

      const result = await command.undo(snapshot);

      expect(result.success).toBe(true);
      expect(mockService.updateBlock).toHaveBeenCalledWith(
        'test-block-1',
        expect.objectContaining({
          content: mockBlock.content,
          parent_id: mockBlock.parent_id,
          prev_id: mockBlock.prev_id,
          next_id: mockBlock.next_id,
          first_child_id: mockBlock.first_child_id
        })
      );
    });
  });

  describe('DeleteBlockCommand', () => {
    test('应该成功执行删除命令', async () => {
      const deleteResponse = { success: true, message: 'Block deleted' };
      
      mockService.getBlock.mockResolvedValueOnce(mockBlock);
      mockService.deleteBlock.mockResolvedValueOnce(deleteResponse);

      const command = new DeleteBlockCommand();
      const context = {
        args: { blockId: 'test-block-1' },
        env: {} as any,
        blockService: mockService
      };

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(deleteResponse);
      expect(context.env.originalBlock).toEqual(mockBlock);
    });

    test('应该成功撤销删除命令', async () => {
      mockService.createBlock.mockResolvedValueOnce(mockBlock);

      const command = new DeleteBlockCommand();
      const snapshot = {
        context: {
          args: { blockId: 'test-block-1' },
          env: { originalBlock: mockBlock },
          blockService: mockService
        }
      } as any;

      const result = await command.undo(snapshot);

      expect(result.success).toBe(true);
      expect(mockService.createBlock).toHaveBeenCalledWith({
        id: mockBlock.id,
        content: mockBlock.content,
        parent_id: mockBlock.parent_id,
        prev_id: mockBlock.prev_id,
        next_id: mockBlock.next_id,
        first_child_id: mockBlock.first_child_id
      });
    });
  });

  describe('MoveBlockCommand', () => {
    test('应该成功执行移动命令', async () => {
      const moveRequest = { parent_id: 'new-parent' };
      const moveResponse = {
        success: true,
        block: { ...mockBlock, parent_id: 'new-parent' },
        message: 'Block moved'
      };
      
      mockService.getBlock.mockResolvedValueOnce(mockBlock);
      mockService.moveBlock.mockResolvedValueOnce(moveResponse);

      const command = new MoveBlockCommand();
      const context = {
        args: { blockId: 'test-block-1', ...moveRequest },
        env: {} as any,
        blockService: mockService
      };

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(moveResponse);
      expect(context.env.originalPosition).toEqual({
        parent_id: mockBlock.parent_id,
        prev_id: mockBlock.prev_id,
        next_id: mockBlock.next_id
      });
    });

    test('应该成功撤销移动命令', async () => {
      const originalPosition = {
        parent_id: null,
        prev_id: null,
        next_id: null
      };

      mockService.moveBlock.mockResolvedValueOnce({
        success: true,
        block: mockBlock,
        message: 'Block moved back'
      });

      const command = new MoveBlockCommand();
      const snapshot = {
        context: {
          args: { blockId: 'test-block-1' },
          env: { originalPosition },
          blockService: mockService
        }
      } as any;

      const result = await command.undo(snapshot);

      expect(result.success).toBe(true);
      expect(mockService.moveBlock).toHaveBeenCalledWith('test-block-1', originalPosition);
    });
  });
});

// ============ 集成测试 ============

describe('Block Module Integration', () => {
  test('应该正确注册所有命令', () => {
    const mockCommandSystem = {
      register: vi.fn()
    };

    registerBlockCommands(mockCommandSystem);

    expect(mockCommandSystem.register).toHaveBeenCalledTimes(11); // 查询命令 + 修改命令
    
    // 验证命令名称
    const commandNames = mockCommandSystem.register.mock.calls.map(
      call => call[0].name
    );
    
    expect(commandNames).toContain('block:list');
    expect(commandNames).toContain('block:get');
    expect(commandNames).toContain('block:children');
    expect(commandNames).toContain('block:siblings');
    expect(commandNames).toContain('block:tree');
    expect(commandNames).toContain('block:create');
    expect(commandNames).toContain('block:update');
    expect(commandNames).toContain('block:replace');
    expect(commandNames).toContain('block:delete');
    expect(commandNames).toContain('block:move');
    expect(commandNames).toContain('block:create-batch');
  });

  test('可撤销命令应该具有正确的属性', () => {
    const createCommand = new CreateBlockCommand();
    const updateCommand = new UpdateBlockCommand();
    const deleteCommand = new DeleteBlockCommand();

    expect(createCommand.undoable).toBe(true);
    expect(updateCommand.undoable).toBe(true);
    expect(deleteCommand.undoable).toBe(true);

    expect(typeof createCommand.undo).toBe('function');
    expect(typeof updateCommand.undo).toBe('function');
    expect(typeof deleteCommand.undo).toBe('function');
  });

  test('查询命令不应该支持撤销', () => {
    const listCommand = new ListBlocksCommand();
    const getCommand = new GetBlockCommand();

    expect('undoable' in listCommand).toBe(false);
    expect('undoable' in getCommand).toBe(false);
  });
}); 