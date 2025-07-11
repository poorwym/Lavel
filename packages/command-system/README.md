# 命令系统 (Command System)

一个功能强大、类型安全的 TypeScript 命令系统，提供完整的命令注册、执行、中间件和事件管理功能。

## 📋 目录

- [特性](#特性)
- [安装](#安装)
- [快速开始](#快速开始)
- [API 文档](#api-文档)
- [中间件系统](#中间件系统)
- [事件系统](#事件系统)
- [内置命令](#内置命令)
- [最佳实践](#最佳实践)
- [类型安全](#类型安全)

## ✨ 特性

- 🔒 **类型安全**: 完整的 TypeScript 支持，提供出色的 IDE 体验
- 🎯 **命令注册**: 灵活的命令定义和注册机制
- 🔐 **权限控制**: 内置用户认证和权限验证系统
- 🛠️ **中间件支持**: 强大的中间件系统，支持前置/后置处理
- 📊 **参数验证**: 自动参数类型检查和自定义验证规则
- 🎈 **别名支持**: 命令别名，提供便捷的快捷方式
- 📡 **事件系统**: 完整的事件监听和通知机制
- ⚡ **批量执行**: 支持顺序和并行批量命令执行
- 🔍 **命令搜索**: 智能命令搜索和统计功能
- 📦 **内置命令**: 丰富的预定义命令集合

## 🚀 安装

```bash
npm install @lavel/command-system
# 或
yarn add @lavel/command-system
# 或
pnpm add @lavel/command-system
```

## 🏃‍♂️ 快速开始

### 基础使用

```typescript
import { createCommandSystem } from '@lavel/command-system';

// 创建命令系统实例
const commandSystem = createCommandSystem({
  debug: true,
  timeout: 5000,
  enableAuth: true
});

// 定义一个简单命令
const helloCommand = {
  name: 'hello',
  description: '打招呼命令',
  parameters: [
    {
      name: 'name',
      type: 'string' as const,
      required: true,
      description: '要打招呼的名字'
    }
  ],
  execute: async (context) => ({
    success: true,
    data: { greeting: `Hello, ${context.args.name}!` }
  })
};

// 注册命令
commandSystem.register(helloCommand);

// 执行命令
const result = await commandSystem.execute('hello', {
  args: { name: 'World' },
  env: {}
});

console.log(result.data.greeting); // "Hello, World!"
```

### 使用内置命令

```typescript
import { CommandLoader } from '@lavel/command-system';

// 注册所有内置命令
CommandLoader.registerAllCommands(commandSystem);

// 或按分类注册
CommandLoader.registerCommandsByCategory(commandSystem, ['math', 'text']);

// 执行数学命令
const addResult = await commandSystem.execute('add', {
  args: { a: 5, b: 3 },
  env: {}
});
console.log(addResult.data.result); // 8
```

## 📚 API 文档

### CommandSystem 类

主要的命令系统类，提供完整的命令管理功能。

```typescript
class CommandSystem {
  // 注册单个命令
  register(command: ICommand): void
  
  // 批量注册命令
  registerCommands(commands: ICommand[]): void
  
  // 注销命令
  unregister(commandName: string): boolean
  
  // 执行命令
  execute(commandName: string, context: ICommandContext): Promise<ICommandResult>
  
  // 批量执行命令（顺序）
  executeBatch(commands: Array<{name: string, context: ICommandContext}>): Promise<ICommandResult[]>
  
  // 批量执行命令（并行）
  executeBatchParallel(commands: Array<{name: string, context: ICommandContext}>): Promise<ICommandResult[]>
  
  // 添加全局中间件
  use(middleware: ICommandMiddleware): void
  
  // 获取命令
  getCommand(commandName: string): ICommand | undefined
  
  // 获取所有命令
  getAllCommands(): ICommand[]
  
  // 获取统计信息
  getStats(): object
}
```

### 命令定义接口

```typescript
interface ICommand {
  name: string;                    // 命令名称
  description: string;             // 命令描述
  category?: string;               // 命令分类
  aliases?: string[];              // 命令别名
  requireAuth?: boolean;           // 是否需要认证
  permissions?: string[];          // 所需权限
  parameters?: ICommandParameter[]; // 参数定义
  execute: (context: ICommandContext) => Promise<ICommandResult> | ICommandResult;
  validate?: (context: ICommandContext) => boolean | Promise<boolean>;
  middleware?: ICommandMiddleware[];
}
```

### 参数定义

```typescript
interface ICommandParameter {
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;
  defaultValue?: any;
  validation?: {
    pattern?: RegExp;     // 正则表达式验证
    min?: number;         // 最小值/长度
    max?: number;         // 最大值/长度
    enum?: any[];         // 枚举值
  };
}
```

## 🔧 中间件系统

中间件提供了强大的横切关注点处理能力。

### 创建自定义中间件

```typescript
const loggingMiddleware: ICommandMiddleware = {
  name: 'logger',
  order: -1000, // 执行顺序
  before: (context) => {
    console.log(`执行命令: ${JSON.stringify(context.args)}`);
    return context;
  },
  after: (context, result) => {
    console.log(`命令完成: ${result.success ? '成功' : '失败'}`);
    return result;
  },
  onError: (context, error) => {
    console.error(`命令错误: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// 添加中间件
commandSystem.use(loggingMiddleware);
```

### 内置中间件

```typescript
import { builtinMiddleware } from '@lavel/command-system';

// 日志中间件
commandSystem.use(builtinMiddleware.logger({
  enableConsole: true,
  logLevel: 'info'
}));

// 性能监控中间件
commandSystem.use(builtinMiddleware.performance({
  slowThreshold: 1000 // 超过1秒警告
}));

// 限流中间件
commandSystem.use(builtinMiddleware.rateLimit({
  maxRequests: 100,
  windowMs: 60000 // 每分钟最多100次请求
}));

// 权限检查中间件
commandSystem.use(builtinMiddleware.authCheck({
  requiredPermissions: ['admin'],
  requireAll: false
}));
```

## 📡 事件系统

监听命令系统事件：

```typescript
const eventEmitter = commandSystem.getEventEmitter();

// 监听命令注册事件
eventEmitter.on('command.registered', (event) => {
  console.log(`新命令已注册: ${event.commandName}`);
});

// 监听命令执行事件
eventEmitter.on('command.executed', (event) => {
  console.log(`命令执行完成: ${event.commandName}`);
  console.log('执行结果:', event.data.result);
});

// 监听错误事件
eventEmitter.on('command.error', (event) => {
  console.error(`命令执行失败: ${event.commandName}`, event.error);
});
```

## 🔨 内置命令

### 数学命令

```typescript
// 加法命令
await commandSystem.execute('add', {
  args: { a: 5, b: 3 },
  env: {}
});

// 随机数生成
await commandSystem.execute('random', {
  args: { min: 1, max: 100, count: 5 },
  env: {}
});
```

### 文本处理命令

```typescript
// 字符串反转
await commandSystem.execute('reverse', {
  args: { text: 'Hello World' },
  env: {}
});
```

### 用户管理命令

```typescript
// 创建用户
await commandSystem.execute('user:create', {
  args: { 
    username: 'john', 
    email: 'john@example.com',
    role: 'user'
  },
  env: {},
  user: { id: 'admin', permissions: ['user:create'] }
});

// 获取用户信息
await commandSystem.execute('user:get', {
  args: { userId: 'user123' },
  env: {},
  user: { id: 'admin', permissions: ['user:read'] }
});
```

### 系统命令

```typescript
// 获取帮助
await commandSystem.execute('help', {
  args: { commandName: 'add' }, // 可选，获取特定命令帮助
  env: { commandSystem }
});

// 系统状态
await commandSystem.execute('status', {
  args: {},
  env: { commandSystem }
});
```

## 💡 最佳实践

### 1. 命令命名规范

```typescript
// 好的命名
'user:create'     // 用冒号分隔命名空间
'file:upload'
'system:status'

// 避免的命名
'createUser'      // 驼峰式不够清晰
'upload_file'     // 下划线不一致
```

### 2. 参数验证

```typescript
const createUserCommand = {
  name: 'user:create',
  parameters: [
    {
      name: 'username',
      type: 'string' as const,
      required: true,
      validation: {
        pattern: /^[a-zA-Z0-9_]+$/,
        min: 3,
        max: 20
      }
    },
    {
      name: 'email',
      type: 'string' as const,
      required: true,
      validation: {
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      }
    }
  ],
  // ...
};
```

### 3. 错误处理

```typescript
const myCommand = {
  name: 'my:command',
  execute: async (context) => {
    try {
      // 命令逻辑
      return { success: true, data: result };
    } catch (error) {
      return { 
        success: false, 
        error: error.message || '未知错误' 
      };
    }
  }
};
```

### 4. 中间件顺序

```typescript
// 使用 order 属性控制执行顺序
const authMiddleware = { name: 'auth', order: -1000 };     // 最先执行
const validationMiddleware = { name: 'validation', order: -500 };
const loggingMiddleware = { name: 'logging', order: 1000 }; // 最后执行
```

## 🛡️ 类型安全

该命令系统提供完整的 TypeScript 类型支持：

```typescript
// 所有接口都有完整的类型定义
import { 
  ICommand, 
  ICommandContext, 
  ICommandResult,
  ICommandParameter,
  ICommandMiddleware 
} from '@lavel/command-system';

// IDE 将提供完整的自动完成和类型检查
const command: ICommand = {
  name: 'example',
  description: 'Example command',
  execute: async (context: ICommandContext): Promise<ICommandResult> => {
    // TypeScript 会检查返回类型
    return { success: true, data: 'result' };
  }
};
```

## 🔧 高级用法

### 自定义验证

```typescript
const customCommand = {
  name: 'transfer',
  validate: async (context) => {
    const { from, to, amount } = context.args;
    // 自定义业务逻辑验证
    if (from === to) return false;
    if (amount <= 0) return false;
    return true;
  },
  execute: async (context) => {
    // 执行转账逻辑
  }
};
```

### 命令组合

```typescript
// 创建命令工作流
const workflow = [
  { name: 'validate', context: validationContext },
  { name: 'process', context: processContext },
  { name: 'notify', context: notificationContext }
];

const results = await commandSystem.executeBatch(workflow);
```

### 动态命令注册

```typescript
// 运行时动态注册命令
function createDynamicCommand(name: string, logic: Function) {
  return {
    name,
    description: `动态生成的命令: ${name}`,
    execute: async (context) => {
      const result = await logic(context.args);
      return { success: true, data: result };
    }
  };
}

const dynamicCmd = createDynamicCommand('dynamic:test', (args) => {
  return `处理参数: ${JSON.stringify(args)}`;
});

commandSystem.register(dynamicCmd);
```

## 📊 性能考虑

- 命令执行支持超时控制
- 内置性能监控中间件
- 支持批量并行执行以提高效率
- 事件系统采用异步处理，不会阻塞命令执行

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## �� 许可证

MIT License 