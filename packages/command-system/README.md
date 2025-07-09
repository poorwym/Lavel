# 命令系统 (@lavel/command-system)

一个灵活、强大的 TypeScript 命令系统框架，支持参数验证、权限控制、中间件、事件系统等企业级功能。

## ✨ 特性

- 🚀 **灵活的命令注册与管理** - 支持动态注册、注销和查找命令
- 📋 **强大的参数验证** - 内置类型检查、格式验证、范围限制等
- 🔐 **权限控制系统** - 支持基于角色的访问控制 (RBAC)
- 🔌 **中间件支持** - 前置、后置处理和错误处理中间件
- 📡 **事件系统** - 命令执行生命周期事件监听
- ⚡ **批量执行** - 支持串行和并行批量命令执行
- 🎯 **别名支持** - 命令可以设置多个别名
- 📊 **性能监控** - 内置执行时间统计和性能测试工具
- 🛡️ **错误处理** - 完善的异常捕获和处理机制
- 📚 **TypeScript 支持** - 完整的类型定义和智能提示

## 📁 项目结构

```
packages/command-system/
├── types.ts             # 类型定义
├── dispatcher.ts        # 调度执行器
├── registry.ts          # 命令注册表
├── index.ts            # 出口模块
├── example.ts          # 使用示例
└── commands/           # 示例命令集合
    ├── basic.ts        # 基础工具命令
    ├── user.ts         # 用户管理命令
    ├── system.ts       # 系统管理命令
    └── index.ts        # 命令索引
```

## 🚀 快速开始

### 1. 基本使用

```typescript
import { createCommandSystem } from '@lavel/command-system';

// 创建命令系统实例
const commandSystem = createCommandSystem({
  debug: true,
  timeout: 30000,
  enableAuth: true
});

// 定义一个简单命令
const helloCommand = {
  name: 'hello',
  description: '问候命令',
  parameters: [
    {
      name: 'name',
      description: '姓名',
      type: 'string',
      required: true
    }
  ],
  execute: async (context) => {
    return {
      success: true,
      data: `你好，${context.args.name}！`
    };
  }
};

// 注册命令
commandSystem.register(helloCommand);

// 执行命令
const result = await commandSystem.execute('hello', {
  args: { name: '世界' },
  env: {},
  user: null
});

console.log(result); // { success: true, data: '你好，世界！' }
```

### 2. 使用内置命令

```typescript
import { CommandLoader } from '@lavel/command-system/commands';

// 注册所有内置命令
CommandLoader.registerAllCommands(commandSystem);

// 执行数学运算
await commandSystem.execute('add', {
  args: { a: 10, b: 20 },
  env: { commandSystem }
});

// 生成随机数
await commandSystem.execute('random', {
  args: { min: 1, max: 100, count: 5 },
  env: { commandSystem }
});

// 查看帮助
await commandSystem.execute('help', {
  args: {},
  env: { commandSystem }
});
```

## 📖 核心概念

### 命令定义

```typescript
interface ICommand {
  name: string;                    // 命令名称
  description: string;             // 命令描述
  category?: string;               // 命令分类
  aliases?: string[];              // 命令别名
  requireAuth?: boolean;           // 是否需要身份验证
  permissions?: string[];          // 所需权限
  parameters?: ICommandParameter[]; // 参数定义
  execute: (context: ICommandContext) => Promise<ICommandResult> | ICommandResult;
  validate?: (context: ICommandContext) => boolean | Promise<boolean>;
  middleware?: ICommandMiddleware[];
}
```

### 参数验证

```typescript
const command = {
  name: 'create-user',
  parameters: [
    {
      name: 'username',
      type: 'string',
      required: true,
      validation: {
        min: 3,
        max: 20,
        pattern: /^[a-zA-Z0-9_]+$/
      }
    },
    {
      name: 'age',
      type: 'number',
      validation: {
        min: 0,
        max: 150
      }
    },
    {
      name: 'role',
      type: 'string',
      validation: {
        enum: ['admin', 'user', 'guest']
      }
    }
  ],
  // ...
};
```

### 权限控制

```typescript
const userManagementCommand = {
  name: 'delete-user',
  requireAuth: true,
  permissions: ['user:delete', 'admin'],
  execute: async (context) => {
    // 只有拥有 'user:delete' 或 'admin' 权限的用户才能执行
    // ...
  }
};

// 执行时提供用户信息
await commandSystem.execute('delete-user', {
  args: { userId: '123' },
  env: {},
  user: {
    id: 'admin-001',
    permissions: ['admin']
  }
});
```

### 中间件

```typescript
import { builtinMiddleware } from '@lavel/command-system';

// 使用内置日志中间件
commandSystem.use(builtinMiddleware.logger({ enableConsole: true }));

// 使用性能监控中间件
commandSystem.use(builtinMiddleware.performance({ slowThreshold: 1000 }));

// 使用限流中间件
commandSystem.use(builtinMiddleware.rateLimit({ 
  maxRequests: 10, 
  windowMs: 60000 
}));

// 自定义中间件
const customMiddleware = {
  name: 'audit',
  order: -500,
  before: async (context) => {
    console.log(`用户 ${context.user?.id} 正在执行命令`);
    return context;
  },
  after: async (context, result) => {
    console.log(`命令执行${result.success ? '成功' : '失败'}`);
    return result;
  }
};

commandSystem.use(customMiddleware);
```

### 事件监听

```typescript
const eventEmitter = commandSystem.getEventEmitter();

// 监听命令执行完成事件
eventEmitter.on('command.executed', (event) => {
  console.log(`命令 ${event.commandName} 执行完成`, event.data);
});

// 监听命令执行失败事件
eventEmitter.on('command.error', (event) => {
  console.error(`命令 ${event.commandName} 执行失败`, event.error);
});
```

## 🛠️ 内置命令

### 基础工具命令

- `add` - 数字加法运算
- `reverse` - 字符串反转
- `random` - 随机数生成
- `uuid` - UUID 生成
- `timestamp` - 时间戳转换

### 用户管理命令

- `user:create` - 创建用户
- `user:get` - 获取用户信息
- `user:list` - 列出用户
- `user:update` - 更新用户
- `user:delete` - 删除用户
- `user:login` - 用户登录

### 系统管理命令

- `help` - 显示帮助信息
- `status` - 系统状态
- `version` - 版本信息
- `clear` - 清空控制台
- `benchmark` - 性能测试
- `exit` - 退出系统

## 📋 使用示例

### 运行完整示例

```typescript
import { runExamples } from '@lavel/command-system/example';

// 运行所有内置示例
await runExamples();
```

### 批量执行命令

```typescript
// 串行执行
const results = await commandSystem.executeBatch([
  { name: 'add', context: { args: { a: 1, b: 2 }, env: {} } },
  { name: 'random', context: { args: { min: 1, max: 10 }, env: {} } }
]);

// 并行执行
const results = await commandSystem.executeBatchParallel([
  { name: 'uuid', context: { args: { count: 3 }, env: {} } },
  { name: 'timestamp', context: { args: { action: 'now' }, env: {} } }
]);
```

### 性能测试

```typescript
await commandSystem.execute('benchmark', {
  args: {
    commandName: 'add',
    iterations: 1000,
    args: { a: 1, b: 2 }
  },
  env: { commandSystem }
});
```

## 🔧 配置选项

```typescript
const commandSystem = createCommandSystem({
  debug: true,           // 是否启用调试模式
  timeout: 30000,        // 命令执行超时时间（毫秒）
  enableAuth: true,      // 是否启用权限验证
  enableLogging: true,   // 是否启用执行日志
  errorHandler: (error, context) => {
    // 自定义错误处理器
    console.error('命令执行错误:', error);
  }
});
```

## 🏗️ 高级用法

### 创建自定义命令分类

```typescript
// 创建数据库操作命令
const dbCommands = [
  {
    name: 'db:connect',
    category: 'database',
    // ...
  },
  {
    name: 'db:query',
    category: 'database',
    // ...
  }
];

// 批量注册
CommandLoader.registerCommands(commandSystem, dbCommands);
```

### 动态命令管理

```typescript
// 动态注册命令
commandSystem.register(newCommand);

// 检查命令是否存在
if (commandSystem.hasCommand('my-command')) {
  // 执行命令
}

// 获取特定分类的命令
const mathCommands = commandSystem.getCommandsByCategory('math');

// 获取统计信息
const stats = commandSystem.getStats();
console.log(`总计 ${stats.totalCommands} 个命令`);
```

## 🤝 扩展开发

### 创建自定义中间件

```typescript
const authMiddleware: ICommandMiddleware = {
  name: 'authentication',
  order: -1000, // 最先执行
  before: async (context) => {
    if (!context.user) {
      throw new Error('需要登录');
    }
    return context;
  }
};
```

### 实现复杂验证

```typescript
const complexCommand = {
  name: 'complex-validation',
  validate: async (context) => {
    // 自定义复杂验证逻辑
    const { startDate, endDate } = context.args;
    return new Date(startDate) < new Date(endDate);
  },
  execute: async (context) => {
    // 命令执行逻辑
  }
};
```

## 📊 性能优化

1. **使用批量执行** - 对于多个独立命令，使用 `executeBatchParallel`
2. **合理设置超时** - 避免长时间阻塞
3. **中间件排序** - 通过 `order` 属性优化中间件执行顺序
4. **事件监听** - 避免过多的事件监听器

## 🐛 调试

启用调试模式：

```typescript
const commandSystem = createCommandSystem({ 
  debug: true,
  enableLogging: true 
});
```

使用内置日志中间件：

```typescript
commandSystem.use(builtinMiddleware.logger({ 
  enableConsole: true,
  logLevel: 'debug' 
}));
```

## 📄 许可证

ISC

## 👨‍💻 作者

alex 