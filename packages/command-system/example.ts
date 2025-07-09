/**
 * 命令系统使用示例
 */

import { 
  createCommandSystem, 
  builtinMiddleware,
  ICommandContext 
} from './index';
import { CommandLoader, allCommands } from './commands/index';

// 创建命令系统实例
const commandSystem = createCommandSystem({
  debug: true,
  timeout: 5000,
  enableAuth: true,
  enableLogging: true
});

// 注册内置中间件
commandSystem.use(builtinMiddleware.logger({ enableConsole: true }));
commandSystem.use(builtinMiddleware.performance({ slowThreshold: 500 }));
commandSystem.use(builtinMiddleware.rateLimit({ maxRequests: 10, windowMs: 60000 }));

// 注册所有示例命令
CommandLoader.registerAllCommands(commandSystem);

// 示例用户
const adminUser = {
  id: 'admin-001',
  permissions: ['admin', 'user:create', 'user:read', 'user:update', 'user:delete', 'user:list']
};

const normalUser = {
  id: 'user-001',
  permissions: ['user:read']
};

/**
 * 执行命令的辅助函数
 */
async function executeCommand(commandName: string, args: Record<string, any>, user?: any) {
  const context: ICommandContext = {
    args,
    env: { commandSystem },
    user,
    session: { sessionId: Date.now().toString() }
  };

  try {
    console.log(`\n执行命令: ${commandName}`, args);
    const result = await commandSystem.execute(commandName, context);
    console.log('执行结果:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('命令执行异常:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * 运行示例
 */
async function runExamples() {
  console.log('=== 命令系统使用示例 ===\n');

  // 1. 基础数学命令
  console.log('1. 基础数学命令');
  await executeCommand('add', { a: 10, b: 20 });
  
  // 2. 字符串处理命令
  console.log('\n2. 字符串处理命令');
  await executeCommand('reverse', { text: '你好世界' });
  
  // 3. 随机数生成
  console.log('\n3. 随机数生成');
  await executeCommand('random', { min: 1, max: 100, count: 5 });
  
  // 4. UUID生成
  console.log('\n4. UUID生成');
  await executeCommand('uuid', { version: 'v4', count: 3 });
  
  // 5. 时间戳操作
  console.log('\n5. 时间戳操作');
  await executeCommand('timestamp', { action: 'now' });
  
  // 6. 帮助命令
  console.log('\n6. 帮助命令');
  await executeCommand('help', {});
  await executeCommand('help', { commandName: 'add' });
  
  // 7. 系统状态
  console.log('\n7. 系统状态');
  await executeCommand('status', {});
  
  // 8. 版本信息
  console.log('\n8. 版本信息');
  await executeCommand('version', {});
  
  // 9. 用户管理命令（需要管理员权限）
  console.log('\n9. 用户管理命令（管理员权限）');
  await executeCommand('user:create', {
    username: 'testuser',
    email: 'test@example.com',
    role: 'user'
  }, adminUser);
  
  await executeCommand('user:list', { page: 1, pageSize: 10 }, adminUser);
  
  // 10. 权限测试（普通用户尝试创建用户）
  console.log('\n10. 权限测试（普通用户尝试创建用户）');
  await executeCommand('user:create', {
    username: 'testuser2',
    email: 'test2@example.com',
    role: 'user'
  }, normalUser);
  
  // 11. 批量执行命令
  console.log('\n11. 批量执行命令');
  const batchCommands = [
    { name: 'add', context: { args: { a: 1, b: 2 }, env: { commandSystem }, user: adminUser } },
    { name: 'add', context: { args: { a: 3, b: 4 }, env: { commandSystem }, user: adminUser } },
    { name: 'random', context: { args: { min: 1, max: 10 }, env: { commandSystem }, user: adminUser } }
  ];
  
  const batchResults = await commandSystem.executeBatch(batchCommands);
  console.log('批量执行结果:', JSON.stringify(batchResults, null, 2));
  
  // 12. 性能测试
  console.log('\n12. 性能测试');
  await executeCommand('benchmark', {
    commandName: 'add',
    iterations: 1000,
    args: { a: 1, b: 2 }
  }, adminUser);
  
  // 13. 参数验证测试
  console.log('\n13. 参数验证测试');
  await executeCommand('add', { a: 'invalid', b: 20 }); // 应该失败
  await executeCommand('reverse', { text: '' }); // 应该失败（长度不符合要求）
  
  // 14. 事件监听示例
  console.log('\n14. 事件监听示例');
  const eventEmitter = commandSystem.getEventEmitter();
  
  eventEmitter.on('command.executed', (event) => {
    console.log(`事件: 命令 '${event.commandName}' 执行完成`);
  });
  
  eventEmitter.on('command.error', (event) => {
    console.log(`事件: 命令 '${event.commandName}' 执行失败`);
  });
  
  await executeCommand('add', { a: 5, b: 5 });
  await executeCommand('invalid-command', {});
  
  // 15. 获取系统统计信息
  console.log('\n15. 系统统计信息');
  const stats = commandSystem.getStats();
  console.log('统计信息:', JSON.stringify(stats, null, 2));
}

/**
 * 自定义命令示例
 */
function createCustomCommand() {
  return {
    name: 'greet',
    description: '个性化问候命令',
    category: 'example',
    parameters: [
      {
        name: 'name',
        description: '用户姓名',
        type: 'string' as const,
        required: true
      },
      {
        name: 'language',
        description: '问候语言',
        type: 'string' as const,
        required: false,
        defaultValue: 'zh',
        validation: {
          enum: ['zh', 'en', 'ja']
        }
      }
    ],
    execute: async (context: ICommandContext) => {
      const { name, language } = context.args;
      
      const greetings = {
        zh: `你好，${name}！欢迎使用命令系统。`,
        en: `Hello, ${name}! Welcome to the command system.`,
        ja: `こんにちは、${name}さん！コマンドシステムへようこそ。`
      };
      
      return {
        success: true,
        data: {
          greeting: greetings[language as keyof typeof greetings],
          name,
          language,
          timestamp: new Date().toLocaleString('zh-CN')
        }
      };
    }
  };
}

/**
 * 主函数
 */
async function main() {
  // 注册自定义命令
  commandSystem.register(createCustomCommand());
  
  // 运行示例
  await runExamples();
  
  // 测试自定义命令
  console.log('\n=== 自定义命令测试 ===');
  await executeCommand('greet', { name: '小明', language: 'zh' });
  await executeCommand('greet', { name: 'John', language: 'en' });
  await executeCommand('greet', { name: '田中', language: 'ja' });
}

// 运行主函数
main().catch(console.error);

export { commandSystem, executeCommand, runExamples }; 