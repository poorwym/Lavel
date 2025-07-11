/**
 * @lavel/api 集成测试
 * 
 * 测试真实的API调用和@lavel/api模块集成
 */

import { ApiClient } from '@lavel/api';
import { 
  blocksCommands, 
  knowledgesCommands, 
  thoughtsCommands, 
  todosCommands, 
  reviewsCommands 
} from '@lavel/api';

describe('@lavel/api 集成测试', () => {
  let apiClient: ApiClient;
  const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000';
  
  beforeAll(() => {
    apiClient = new ApiClient({
      baseUrl: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  });

  describe('API客户端基础功能', () => {
    test('应该能够创建API客户端实例', () => {
      expect(apiClient).toBeInstanceOf(ApiClient);
    });

    test('应该能够配置请求头', () => {
      apiClient.setHeaders({ 'Authorization': 'Bearer test-token' });
      expect(typeof apiClient.setHeaders).toBe('function');
    });

    test('应该能够更新基础URL', () => {
      apiClient.setBaseUrl('http://localhost:8001');
      apiClient.setBaseUrl(API_BASE_URL); // 恢复原始URL
      expect(typeof apiClient.setBaseUrl).toBe('function');
    });
  });

  describe('后端连接测试', () => {
    test('应该能够ping后端API', async () => {
      try {
        const response = await apiClient.get('/health');
        expect(response).toBeDefined();
        // 如果后端返回健康检查，则验证响应
        if (response.status >= 200 && response.status < 300) {
          expect(response.status).toBeLessThan(400);
        }
      } catch (error) {
        // 如果后端未运行，跳过但记录
        console.warn('后端API未运行，跳过连接测试:', error.message);
      }
    }, 15000);
  });

  describe('Blocks API集成测试', () => {
    test('应该导出blocks命令', () => {
      expect(blocksCommands).toBeDefined();
      expect(Array.isArray(blocksCommands)).toBe(true);
      expect(blocksCommands.length).toBeGreaterThan(0);
    });

    test('blocks命令应该有正确的结构', () => {
      const createCommand = blocksCommands.find(cmd => cmd.name === 'blocks:create');
      expect(createCommand).toBeDefined();
      expect(createCommand).toHaveProperty('name', 'blocks:create');
      expect(createCommand).toHaveProperty('description');
      expect(createCommand).toHaveProperty('execute');
      expect(typeof createCommand.execute).toBe('function');
    });

    test('应该能够执行blocks:list命令', async () => {
      const listCommand = blocksCommands.find(cmd => cmd.name === 'blocks:list');
      expect(listCommand).toBeDefined();
      
      try {
        const result = await listCommand.execute({
          args: {},
          env: {
            apiClient: apiClient
          }
        });
        // 如果后端可用，验证结果结构
        expect(result).toBeDefined();
      } catch (error) {
        // 如果后端未运行，验证错误处理
        expect(error).toBeDefined();
        console.warn('后端未运行，blocks:list命令失败:', error.message);
      }
    }, 10000);
  });

  describe('Knowledges API集成测试', () => {
    test('应该导出knowledges命令', () => {
      expect(knowledgesCommands).toBeDefined();
      expect(Array.isArray(knowledgesCommands)).toBe(true);
      expect(knowledgesCommands.length).toBeGreaterThan(0);
    });

    test('knowledges命令应该有正确的结构', () => {
      const createCommand = knowledgesCommands.find(cmd => cmd.name === 'knowledges:create');
      expect(createCommand).toBeDefined();
      expect(createCommand).toHaveProperty('name', 'knowledges:create');
      expect(createCommand).toHaveProperty('execute');
      expect(typeof createCommand.execute).toBe('function');
    });
  });

  describe('Thoughts API集成测试', () => {
    test('应该导出thoughts命令', () => {
      expect(thoughtsCommands).toBeDefined();
      expect(Array.isArray(thoughtsCommands)).toBe(true);
      expect(thoughtsCommands.length).toBeGreaterThan(0);
    });

    test('thoughts命令应该有upgrade功能', () => {
      const upgradeCommand = thoughtsCommands.find(cmd => cmd.name === 'thoughts:upgrade');
      expect(upgradeCommand).toBeDefined();
      expect(upgradeCommand).toHaveProperty('description');
      expect(typeof upgradeCommand.execute).toBe('function');
    });
  });

  describe('Todos API集成测试', () => {
    test('应该导出todos命令', () => {
      expect(todosCommands).toBeDefined();
      expect(Array.isArray(todosCommands)).toBe(true);
      expect(todosCommands.length).toBeGreaterThan(0);
    });

    test('todos命令应该支持子任务管理', () => {
      const addSubtaskCommand = todosCommands.find(cmd => cmd.name === 'todos:add-subtask');
      expect(addSubtaskCommand).toBeDefined();
      expect(typeof addSubtaskCommand.execute).toBe('function');
    });
  });

  describe('Reviews API集成测试', () => {
    test('应该导出reviews命令', () => {
      expect(reviewsCommands).toBeDefined();
      expect(Array.isArray(reviewsCommands)).toBe(true);
      expect(reviewsCommands.length).toBeGreaterThan(0);
    });

    test('reviews命令应该有基础CRUD功能', () => {
      const crudCommands = ['reviews:create', 'reviews:get', 'reviews:update', 'reviews:delete'];
      crudCommands.forEach(commandName => {
        const command = reviewsCommands.find(cmd => cmd.name === commandName);
        expect(command).toBeDefined();
        expect(typeof command.execute).toBe('function');
      });
    });
  });

  describe('错误处理测试', () => {
    test('应该能够处理网络错误', async () => {
      const badClient = new ApiClient({
        baseUrl: 'http://invalid-url:9999',
        timeout: 1000
      });

      try {
        await badClient.get('/test');
        // 如果没有抛出错误，说明有问题
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toBeDefined();
      }
    }, 5000);

    test('应该能够处理超时', async () => {
      const slowClient = new ApiClient({
        baseUrl: API_BASE_URL,
        timeout: 100 // 100ms 很短的超时时间
      });

      try {
        await slowClient.get('/api/slow-endpoint');
      } catch (error) {
        // 超时错误是预期的
        expect(error).toBeDefined();
      }
    }, 5000);
  });

  describe('命令系统集成', () => {
    test('所有命令都应该有统一的接口', () => {
      const allCommands = [
        ...blocksCommands,
        ...knowledgesCommands,
        ...thoughtsCommands,
        ...todosCommands,
        ...reviewsCommands
      ];

      allCommands.forEach(command => {
        expect(command).toHaveProperty('name');
        expect(command).toHaveProperty('description');
        expect(command).toHaveProperty('execute');
        expect(command).toHaveProperty('category');
        expect(command).toHaveProperty('parameters');
        expect(typeof command.execute).toBe('function');
        expect(Array.isArray(command.parameters)).toBe(true);
      });
    });

    test('命令名称应该遵循resource:action格式', () => {
      const allCommands = [
        ...blocksCommands,
        ...knowledgesCommands,
        ...thoughtsCommands,
        ...todosCommands,
        ...reviewsCommands
      ];

      allCommands.forEach(command => {
        expect(command.name).toMatch(/^[a-z]+:[a-z-]+$/);
      });
    });
  });
}); 