# @lavel/block

Lavel 项目的 Block（最小编辑单元）核心模块，提供完整的块管理功能，包括创建、查询、更新、删除和移动操作，支持双向链表结构和完整的撤销/重做功能。

## ✨ 特性

- 🔗 **双向链表结构** - Block 采用双向链表组织，支持灵活的层级关系
- 🔒 **类型安全** - 完整的 TypeScript 支持，提供优秀的开发体验
- 🌐 **API 封装** - 与后端 FastAPI 的完整通信封装
- 🛡️ **数据验证** - 内置的业务逻辑验证和错误处理
- 🎯 **命令系统** - 与 @lavel/command-system 深度集成
- ↩️ **撤销支持** - 所有修改操作支持撤销/重做功能
- ⚡ **高性能** - 优化的 API 调用和状态管理
- 🧪 **完整测试** - 全面的单元测试和集成测试覆盖

## 📦 安装

```bash
npm install @lavel/block
```

## 🏗️ 架构设计

Block 模块采用分层架构设计：

```
┌─────────────────┐
│   Commands      │  ← 命令层（集成命令系统和撤销功能）
├─────────────────┤
│   Service       │  ← 服务层（业务逻辑和验证）
├─────────────────┤
│   API           │  ← API层（HTTP 通信封装）
├─────────────────┤
│   Models        │  ← 数据模型（类型定义）
└─────────────────┘
```

### Block 数据结构

每个 Block 使用双向链表结构连接：

```typescript
interface Block {
  id: string;              // 唯一标识
  content: string;         // 文本内容
  parent_id?: string;      // 父块 ID
  prev_id?: string;        // 前一个兄弟块 ID
  next_id?: string;        // 后一个兄弟块 ID
  first_child_id?: string; // 第一个子块 ID
  created_at: string;      // 创建时间
  updated_at: string;      // 更新时间
}
```

## 🚀 快速开始

### 基础使用

```typescript
import { blockService, registerBlockCommands } from '@lavel/block';
import { CommandSystem } from '@lavel/command-system';

// 1. 创建命令系统并注册 block 命令
const commandSystem = new CommandSystem();
registerBlockCommands(commandSystem);

// 2. 直接使用服务层
const blocks = await blockService.listBlocks({ page: 1, limit: 10 });
console.log('获取到的块:', blocks);

// 3. 创建新的 block
const newBlock = await blockService.createBlock({
  content: 'Hello World!',
  parent_id: null
});
console.log('创建的块:', newBlock);

// 4. 通过命令系统执行（支持撤销）
const result = await commandSystem.execute('block:create', {
  content: '可撤销的块',
  parent_id: null
});
```

### 高级配置

```typescript
import { 
  initializeBlockModule,
  createBlockService,
  createBlockApi 
} from '@lavel/block';

// 自定义 API 配置
const customApi = createBlockApi({
  baseUrl: 'https://api.example.com',
  timeout: 10000,
  headers: {
    'Authorization': 'Bearer your-token'
  }
});

// 自定义服务配置
const customService = createBlockService(
  {
    api: customApi,
    validateOnCreate: true,
    validateOnUpdate: true
  },
  {
    minContentLength: 1,
    maxContentLength: 5000,
    allowEmptyContent: false
  }
);

// 一键初始化
const { service, api } = initializeBlockModule(
  commandSystem,
  { baseUrl: 'https://api.example.com' },
  { validateOnCreate: true },
  { maxContentLength: 5000 }
);
```

## 📚 API 文档

### 服务层 API

#### 查询操作

```typescript
// 列出 blocks（支持分页和筛选）
const blocks = await blockService.listBlocks({
  page: 1,
  limit: 20,
  parent_id: 'parent-block-id',
  tags: 'tag1,tag2'
});

// 获取单个 block
const block = await blockService.getBlock('block-id');

// 获取子 blocks
const children = await blockService.getBlockChildren('parent-block-id');

// 获取兄弟 blocks
const siblings = await blockService.getBlockSiblings('block-id');

// 获取完整树结构
const tree = await blockService.getBlockTree('root-block-id');
```

#### 修改操作（支持撤销）

```typescript
// 创建 block
const newBlock = await blockService.createBlock({
  content: 'Block content',
  parent_id: 'parent-id',
  prev_id: 'previous-sibling-id'
});

// 部分更新 block
const updatedBlock = await blockService.updateBlock('block-id', {
  content: 'Updated content'
});

// 完全替换 block
const replacedBlock = await blockService.replaceBlock('block-id', {
  content: 'New content',
  parent_id: 'new-parent-id'
});

// 删除 block
const deleteResult = await blockService.deleteBlock('block-id');

// 移动 block
const moveResult = await blockService.moveBlock('block-id', {
  parent_id: 'new-parent-id',
  prev_id: 'new-previous-sibling-id'
});

// 批量创建 blocks
const batchResult = await blockService.createBlocks([
  { content: 'Block 1' },
  { content: 'Block 2' },
  { content: 'Block 3' }
]);
```

### 命令系统 API

#### 查询命令

```typescript
// 列出 blocks
await commandSystem.execute('block:list', {
  page: 1,
  limit: 20
});

// 获取单个 block
await commandSystem.execute('block:get', {
  blockId: 'block-id'
});

// 获取子 blocks
await commandSystem.execute('block:children', {
  blockId: 'parent-block-id'
});

// 获取兄弟 blocks
await commandSystem.execute('block:siblings', {
  blockId: 'block-id'
});

// 获取 block 树
await commandSystem.execute('block:tree', {
  rootId: 'root-block-id'
});
```

#### 修改命令（支持撤销）

```typescript
// 创建 block
await commandSystem.execute('block:create', {
  content: 'Block content',
  parent_id: 'parent-id'
});

// 更新 block
await commandSystem.execute('block:update', {
  blockId: 'block-id',
  content: 'Updated content'
});

// 替换 block
await commandSystem.execute('block:replace', {
  blockId: 'block-id',
  content: 'New content',
  parent_id: 'new-parent-id'
});

// 删除 block
await commandSystem.execute('block:delete', {
  blockId: 'block-id'
});

// 移动 block
await commandSystem.execute('block:move', {
  blockId: 'block-id',
  parent_id: 'new-parent-id'
});

// 批量创建 blocks
await commandSystem.execute('block:create-batch', {
  blocks: [
    { content: 'Block 1' },
    { content: 'Block 2' }
  ]
});
```

### 撤销功能

```typescript
import { createUndoSystem } from '@lavel/undo-system';

// 创建撤销系统
const undoSystem = createUndoSystem(commandSystem);

// 执行可撤销的操作
await commandSystem.execute('block:create', {
  content: 'Test block'
});

await commandSystem.execute('block:update', {
  blockId: 'test-block-id',
  content: 'Updated content'
});

// 撤销最后的操作
await undoSystem.undo(); // 撤销更新操作

// 重做操作
await undoSystem.redo(); // 重做更新操作

// 撤销创建操作
await undoSystem.undo(); // 撤销创建操作（删除 block）
```

## 🔧 配置选项

### API 配置

```typescript
interface ApiConfig {
  baseUrl: string;                    // API 基础 URL
  timeout?: number;                   // 请求超时时间（毫秒）
  headers?: Record<string, string>;   // 自定义请求头
}
```

### 服务配置

```typescript
interface BlockServiceConfig {
  api?: BlockApi;              // 自定义 API 客户端
  validateOnCreate?: boolean;  // 创建时是否验证
  validateOnUpdate?: boolean;  // 更新时是否验证
  autoGenerateIds?: boolean;   // 是否自动生成 ID
}

interface BlockValidationRules {
  minContentLength?: number;      // 最小内容长度
  maxContentLength?: number;      // 最大内容长度
  allowEmptyContent?: boolean;    // 是否允许空内容
  validateParentExists?: boolean; // 是否验证父块存在
  validateSiblingChain?: boolean; // 是否验证兄弟链完整性
}
```

## 🎯 使用场景

### 1. 构建层级文档结构

```typescript
// 创建文档根节点
const document = await blockService.createBlock({
  content: '# 我的文档',
  parent_id: null
});

// 创建章节
const chapter1 = await blockService.createBlock({
  content: '## 第一章',
  parent_id: document.id
});

// 创建段落
const paragraph1 = await blockService.createBlock({
  content: '这是第一段内容...',
  parent_id: chapter1.id
});

const paragraph2 = await blockService.createBlock({
  content: '这是第二段内容...',
  parent_id: chapter1.id,
  prev_id: paragraph1.id
});
```

### 2. 实现拖拽重排

```typescript
// 将一个 block 移动到新位置
async function moveBlockToNewPosition(
  blockId: string,
  newParentId: string,
  afterBlockId?: string
) {
  const result = await commandSystem.execute('block:move', {
    blockId,
    parent_id: newParentId,
    prev_id: afterBlockId || null
  });
  
  // 操作支持撤销
  return result;
}
```

### 3. 批量操作与事务

```typescript
import { createUndoSystem } from '@lavel/undo-system';

const undoSystem = createUndoSystem(commandSystem);

// 开始事务
const txId = undoSystem.beginTransaction('batch-create', '批量创建blocks');

try {
  // 批量创建相关的 blocks
  const blocks = await commandSystem.execute('block:create-batch', {
    blocks: [
      { content: '任务1', parent_id: 'todo-list' },
      { content: '任务2', parent_id: 'todo-list' },
      { content: '任务3', parent_id: 'todo-list' }
    ]
  });
  
  // 提交事务
  undoSystem.commitTransaction(txId);
  
  console.log('批量创建成功，可以一次性撤销');
} catch (error) {
  // 回滚事务
  undoSystem.rollbackTransaction(txId);
  console.error('批量创建失败，已回滚');
}
```

### 4. 自定义验证规则

```typescript
const strictService = createBlockService(
  { validateOnCreate: true, validateOnUpdate: true },
  {
    minContentLength: 5,
    maxContentLength: 1000,
    allowEmptyContent: false,
    validateParentExists: true,
    validateSiblingChain: true
  }
);

try {
  await strictService.createBlock({
    content: 'Hi' // 太短，会抛出验证错误
  });
} catch (error) {
  console.error('验证失败:', error.message);
  // 输出: Content too short (min: 5)
}
```

## 🧪 测试

运行测试：

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test -- block.test.ts

# 运行测试并生成覆盖率报告
npm run test:coverage
```

测试覆盖了以下场景：

- ✅ API 层的所有 HTTP 操作
- ✅ 服务层的业务逻辑验证
- ✅ 命令系统的执行和撤销
- ✅ 错误处理和边界情况
- ✅ 网络异常和超时处理
- ✅ 批量操作和事务处理

## 🔗 依赖关系

- `@lavel/command-system` - 命令系统核心
- `@lavel/undo-system` - 撤销系统核心

## 📈 性能优化

### 1. 批量操作

使用批量 API 减少网络请求：

```typescript
// ❌ 多次单独创建
for (const content of contents) {
  await blockService.createBlock({ content });
}

// ✅ 批量创建
await blockService.createBlocks(
  contents.map(content => ({ content }))
);
```

### 2. 缓存策略

```typescript
// 自定义 API 客户端with缓存
class CachedBlockApi extends BlockApi {
  private cache = new Map();
  
  async getBlock(blockId: string) {
    if (this.cache.has(blockId)) {
      return this.cache.get(blockId);
    }
    
    const block = await super.getBlock(blockId);
    this.cache.set(blockId, block);
    return block;
  }
}
```

### 3. 分页优化

```typescript
// 使用合适的分页大小
const OPTIMAL_PAGE_SIZE = 50;

const blocks = await blockService.listBlocks({
  page: 1,
  limit: OPTIMAL_PAGE_SIZE
});
```

## 🚨 错误处理

### 常见错误类型

```typescript
import { BlockServiceError, BlockApiError } from '@lavel/block';

try {
  await blockService.createBlock({ content: '' });
} catch (error) {
  if (error instanceof BlockServiceError) {
    console.error(`业务错误: ${error.message} (${error.code})`);
  } else if (error instanceof BlockApiError) {
    console.error(`API错误: ${error.message} (状态码: ${error.status})`);
  } else {
    console.error('未知错误:', error);
  }
}
```

### 错误代码

| 错误代码 | 描述 | 处理建议 |
|---------|------|---------|
| `MISSING_BLOCK_ID` | 缺少 Block ID | 检查传入的参数 |
| `BLOCK_NOT_FOUND` | Block 不存在 | 验证 Block ID 的有效性 |
| `CONTENT_TOO_SHORT` | 内容过短 | 增加内容长度 |
| `CONTENT_TOO_LONG` | 内容过长 | 减少内容长度 |
| `PARENT_NOT_FOUND` | 父块不存在 | 验证父块 ID |
| `INVALID_SIBLING_CHAIN` | 兄弟链无效 | 检查兄弟块关系 |

## 🤝 贡献指南

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feature/new-feature`
3. 提交更改：`git commit -am 'Add new feature'`
4. 推送分支：`git push origin feature/new-feature`
5. 提交 Pull Request

## 📄 许可证

MIT License - 查看 [LICENSE](../../../LICENSE) 文件了解详情。

## 🔗 相关链接

- [Lavel 主项目](https://github.com/lavel/lavel)
- [@lavel/command-system](../command-system)
- [@lavel/undo-system](../undo-system)
- [API 文档](./docs/api.md)
- [类型定义](./model/block.model.ts) 