# Lavel Core API

Lavel项目的核心API模块，提供与后端FastAPI服务通信的基础接口和命令系统集成。

## 功能特性

- 🔧 **类型安全的HTTP客户端** - 完整的TypeScript类型支持
- 📦 **资源API接口** - 支持所有Lavel资源：Blocks、Knowledges、Thoughts、Todos、Reviews
- ⚡ **命令系统集成** - 将HTTP操作封装为可撤销的命令
- 🎯 **统一的错误处理** - 标准化的响应格式
- 📝 **完整的类型定义** - 与后端schema保持同步

## 架构设计

```
packages/core/api/
├── client.ts              # HTTP客户端基础类
├── index.ts               # 模块主入口
├── example.ts             # 使用示例
├── README.md              # 本文档
└── resources/             # 资源API目录
    ├── commands.ts        # 命令注册器
    ├── blocks/            # Block资源
    │   ├── api.ts         # API接口
    │   ├── types.ts       # 类型定义
    │   └── commands.ts    # 命令定义
    ├── knowledges/        # Knowledge资源
    ├── thoughts/          # Thought资源
    ├── todos/             # Todo资源
    └── reviews/           # Review资源
```

## 快速开始

### 1. 基础HTTP客户端使用

```typescript
import { defaultApiClient, blocksApi } from '@lavel/api';

// 配置API服务器地址
defaultApiClient.setBaseUrl('http://localhost:8000');

// 创建一个block
const result = await blocksApi.createBlock({
  content: '这是一个测试块'
});

if (result.success) {
  console.log('创建成功:', result.data);
} else {
  console.error('创建失败:', result.error);
}
```

### 2. 命令系统集成

```typescript
import { createCommandSystem } from '@lavel/command-system';
import { registerResourceCommands } from '@lavel/api';

// 创建命令系统
const commandSystem = createCommandSystem({
  debug: true,
  enableAuth: false
});

// 注册所有资源命令
registerResourceCommands(commandSystem);

// 使用命令创建知识文档
const result = await commandSystem.execute('knowledges:create', {
  args: {
    title: '测试知识文档',
    description: '通过命令系统创建',
    tags: ['测试']
  },
  env: { commandSystem },
  user: { id: 'user-123', permissions: [] }
});
```

### 3. 批量操作

```typescript
// 批量创建多个资源
const batchCommands = [
  {
    name: 'thoughts:create',
    context: {
      args: { summary: '项目架构思考', tags: ['架构'] },
      env: { commandSystem },
      user: { id: 'user-123', permissions: [] }
    }
  },
  {
    name: 'todos:create',
    context: {
      args: { title: '完成API开发', tags: ['开发'] },
      env: { commandSystem },
      user: { id: 'user-123', permissions: [] }
    }
  }
];

const results = await commandSystem.executeBatch(batchCommands);
```

## 支持的资源

### Blocks (最小编辑单元)
- `blocks:create` - 创建新块
- `blocks:get` - 获取指定块
- `blocks:update` - 更新块内容
- `blocks:delete` - 删除块
- `blocks:list` - 获取块列表
- `blocks:move` - 移动块位置
- `blocks:children` - 获取子块
- `blocks:siblings` - 获取兄弟块

### Knowledges (知识文档)
- `knowledges:create` - 创建知识文档
- `knowledges:get` - 获取知识文档
- `knowledges:update` - 更新文档元数据
- `knowledges:delete` - 删除文档
- `knowledges:list` - 获取文档列表
- `knowledges:search` - 搜索文档

### Thoughts (思考笔记)
- `thoughts:create` - 创建思考笔记
- `thoughts:get` - 获取笔记
- `thoughts:update` - 更新笔记
- `thoughts:delete` - 删除笔记
- `thoughts:list` - 获取笔记列表
- `thoughts:upgrade` - 升级为知识文档

### Todos (任务管理)
- `todos:create` - 创建任务
- `todos:get` - 获取任务
- `todos:update` - 更新任务元数据
- `todos:status` - 更新任务状态
- `todos:delete` - 删除任务
- `todos:list` - 获取任务列表
- `todos:add-subtask` - 添加子任务

### Reviews (复盘记录)
- `reviews:create` - 创建复盘记录
- `reviews:get` - 获取复盘记录
- `reviews:update` - 更新记录
- `reviews:delete` - 删除记录
- `reviews:list` - 获取记录列表

## API响应格式

所有API调用都返回统一的响应格式：

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}
```

## 错误处理

```typescript
const result = await blocksApi.createBlock({ content: 'test' });

if (result.success) {
  // 成功处理
  console.log('数据:', result.data);
} else {
  // 错误处理
  console.error('错误:', result.error);
  console.error('状态码:', result.status);
}
```

## 配置选项

### HTTP客户端配置

```typescript
import { ApiClient } from '@lavel/api';

const customClient = new ApiClient({
  baseUrl: 'https://api.example.com',
  timeout: 15000,
  headers: {
    'Authorization': 'Bearer token',
    'X-Client-Version': '1.0.0'
  }
});
```

### 命令系统配置

```typescript
const commandSystem = createCommandSystem({
  debug: true,           // 调试模式
  timeout: 10000,        // 命令超时时间(ms)
  enableAuth: false,     // 是否启用权限验证
  enableLogging: true    // 是否启用日志
});
```

## 开发指南

### 添加新的资源API

1. 在`resources/`下创建新的资源目录
2. 创建`types.ts`定义TypeScript类型
3. 创建`api.ts`实现API客户端类
4. 创建`commands.ts`定义命令
5. 在`resources/commands.ts`中注册新命令
6. 在`index.ts`中导出新模块

### 类型定义同步

API类型定义应与后端Pydantic模型保持同步。当后端模型更新时，需要相应更新TypeScript类型定义。

## 注意事项

1. **底层HTTP操作不支持撤销** - 符合设计要求，只有业务逻辑层面的操作才支持撤销
2. **类型安全** - 所有API调用都有完整的TypeScript类型检查
3. **错误处理** - 始终检查`result.success`来判断操作是否成功
4. **超时处理** - 默认超时时间为10秒，可以通过配置修改

## 示例项目

查看`example.ts`文件了解完整的使用示例，包括：
- 直接API调用
- 命令系统集成
- 批量操作
- 错误处理 