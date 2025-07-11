/**
 * Lavel Core API 使用示例
 * 
 * 演示如何使用API客户端和命令系统
 */

import { createCommandSystem } from '../../command-system';
import { 
  defaultApiClient,
  blocksApi, 
  knowledgesApi,
  thoughtsApi,
  todosApi,
  reviewsApi,
  registerResourceCommands
} from './index';

// 创建命令系统实例
const commandSystem = createCommandSystem({
  debug: true,
  timeout: 10000,
  enableAuth: false,
  enableLogging: true
});

// 注册所有资源命令
registerResourceCommands(commandSystem);

// 配置API客户端
defaultApiClient.setBaseUrl('http://localhost:8000');

/**
 * 示例：使用API客户端直接调用
 */
async function apiClientExample() {
  console.log('=== API客户端示例 ===');
  
  // 创建一个block
  const createResult = await blocksApi.createBlock({
    content: '这是一个测试块'
  });
  
  if (createResult.success) {
    console.log('创建成功:', createResult.data);
    
    // 获取刚创建的block
    const getResult = await blocksApi.getBlock(createResult.data!.id);
    if (getResult.success) {
      console.log('获取成功:', getResult.data);
    }
  } else {
    console.error('创建失败:', createResult.error);
  }
}

/**
 * 示例：使用命令系统调用
 */
async function commandSystemExample() {
  console.log('\n=== 命令系统示例 ===');
  
  // 创建知识文档
  const createKnowledgeResult = await commandSystem.execute('knowledges:create', {
    args: {
      title: '测试知识文档',
      description: '这是一个通过命令系统创建的知识文档',
      tags: ['测试', '示例']
    },
    env: { commandSystem },
    user: { id: 'demo-user', permissions: [] }
  });
  
  console.log('创建知识文档结果:', createKnowledgeResult);
  
  // 创建任务
  const createTodoResult = await commandSystem.execute('todos:create', {
    args: {
      title: '完成API集成',
      description: '集成所有资源的API接口',
      tags: ['开发', '集成'],
      auto_expand: true
    },
    env: { commandSystem },
    user: { id: 'demo-user', permissions: [] }
  });
  
  console.log('创建任务结果:', createTodoResult);
  
  // 获取所有可用命令
  const allCommands = commandSystem.getAll();
  const resourceCommands = allCommands.filter(cmd => 
    cmd.category && ['blocks', 'knowledges', 'thoughts', 'todos', 'reviews'].includes(cmd.category)
  );
  
  console.log('\n可用的资源命令:');
  resourceCommands.forEach(cmd => {
    console.log(`- ${cmd.name}: ${cmd.description}`);
  });
}

/**
 * 示例：批量操作
 */
async function batchOperationExample() {
  console.log('\n=== 批量操作示例 ===');
  
  // 批量创建思考笔记
  const batchCommands = [
    {
      name: 'thoughts:create',
      context: {
        args: { summary: '想法1：关于项目架构的思考', tags: ['架构'] },
        env: { commandSystem },
        user: { id: 'demo-user', permissions: [] }
      }
    },
    {
      name: 'thoughts:create', 
      context: {
        args: { summary: '想法2：用户体验优化方案', tags: ['UX'] },
        env: { commandSystem },
        user: { id: 'demo-user', permissions: [] }
      }
    },
    {
      name: 'reviews:create',
      context: {
        args: { title: '本周工作回顾', summary: '完成了基础API开发', tags: ['周报'] },
        env: { commandSystem },
        user: { id: 'demo-user', permissions: [] }
      }
    }
  ];
  
  const batchResults = await commandSystem.executeBatch(batchCommands);
  console.log('批量操作结果:', batchResults);
}

/**
 * 主函数
 */
async function main() {
  try {
    await apiClientExample();
    await commandSystemExample();
    await batchOperationExample();
  } catch (error) {
    console.error('示例执行出错:', error);
  }
}

// 导出示例函数供测试使用
export {
  apiClientExample,
  commandSystemExample,
  batchOperationExample,
  main,
  commandSystem
};

// 如果直接运行此文件
if (require.main === module) {
  main().catch(console.error);
} 