# @lavel/knowledge

Lavel Knowledge 核心模块 - 知识文档管理系统

## 概述

`@lavel/knowledge` 是 Lavel 项目的知识文档管理核心模块，提供完整的知识文档创建、编辑、搜索和管理功能。该模块基于 Block 系统构建，支持类似 Obsidian 的链接机制和 Markdown 导出功能。

## 功能特性

- ✅ **完整的 CRUD 操作** - 创建、读取、更新、删除知识文档
- ✅ **强大的搜索功能** - 支持全文搜索和标签筛选
- ✅ **反向链接系统** - 自动维护知识文档间的引用关系
- ✅ **Markdown 导出** - 支持导出为标准 Markdown 格式
- ✅ **命令系统集成** - 支持撤销/重做操作
- ✅ **标签管理** - 灵活的标签分类和筛选
- ✅ **类型安全** - 完整的 TypeScript 类型定义
- ✅ **错误处理** - 完善的错误处理和验证机制

## 快速开始

### 安装

```bash
# 作为 Lavel 项目的一部分，通过 workspace 安装
pnpm install
```

### 基本使用

```typescript
import { 
  knowledgeService, 
  createQuickKnowledge,
  initializeKnowledgeModule 
} from '@lavel/knowledge';

// 快速创建知识文档
const knowledge = await createQuickKnowledge('我的第一个知识文档', {
  description: '这是一个测试文档',
  tags: ['学习', '笔记']
});

// 搜索知识文档
const searchResults = await knowledgeService.searchKnowledges('学习');

// 获取反向链接
const backlinks = await knowledgeService.getKnowledgeBacklinks(knowledge.id);
```

## 架构设计

模块采用分层架构设计：

```
┌─────────────────────────────────────────┐
│              Command Layer              │  ← 命令系统集成（撤销/重做）
├─────────────────────────────────────────┤
│              Service Layer              │  ← 业务逻辑和验证
├─────────────────────────────────────────┤
│                API Layer                │  ← HTTP 客户端封装
├─────────────────────────────────────────┤
│               Model Layer               │  ← 数据模型定义
└─────────────────────────────────────────┘
```

## API 参考

### 数据模型

#### Knowledge 基础模型

```typescript
interface Knowledge {
  id: string;                    // 唯一标识
  title: string;                 // 知识标题
  description: string;           // 简介
  tags: string[];               // 标签列表
  root_block_id: string;        // 根块ID
  linked_blocks: string[];      // 链接的 blocks
  backlinks: string[];          // 反向链接
  created_at: string;           // 创建时间
  updated_at: string;           // 更新时间
}
```

#### 请求模型

```typescript
interface CreateKnowledgeRequest {
  id?: string;                  // 可选的自定义ID
  title: string;               // 必需的标题
  description?: string;        // 可选的描述
  tags?: string[];            // 可选的标签
  content?: string;           // 可选的初始内容
  linked_blocks?: string[];   // 可选的链接blocks
}
```

### API 客户端

#### KnowledgeApi 类

```typescript
import { KnowledgeApi } from '@lavel/knowledge';

const api = new KnowledgeApi({
  baseUrl: 'http://localhost:8000',
  timeout: 5000
});

// 列出知识文档
const response = await api.listKnowledges({
  page: 1,
  limit: 20,
  tags: '学习,笔记',
  search: '关键词'
});

// 创建知识文档
const knowledge = await api.createKnowledge({
  title: '新知识文档',
  description: '描述',
  tags: ['标签1', '标签2']
});

// 获取单个知识文档
const knowledge = await api.getKnowledge('knowledge-id');

// 更新元数据
const updated = await api.updateKnowledgeMetadata('knowledge-id', {
  title: '新标题',
  tags: ['新标签']
});

// 删除知识文档
const result = await api.deleteKnowledge('knowledge-id');

// 搜索
const searchResults = await api.searchKnowledges('搜索关键词');

// 导出 Markdown
const markdown = await api.exportKnowledgeToMarkdown('knowledge-id', {
  include_metadata: true,
  include_backlinks: false
});

// 获取反向链接
const backlinks = await api.getKnowledgeBacklinks('knowledge-id');

// 链接 Block
const linkResult = await api.linkBlockToKnowledge('knowledge-id', {
  block_id: 'block-id',
  position: 0,
  link_type: 'reference'
});
```

### 服务层

#### KnowledgeService 类

```typescript
import { KnowledgeService, createKnowledgeService } from '@lavel/knowledge';

// 使用默认服务
const result = await knowledgeService.createKnowledge({
  title: '测试文档',
  description: '描述'
});

// 创建自定义服务
const customService = createKnowledgeService({
  validateOnCreate: true,
  autoGenerateIds: true
}, {
  minTitleLength: 1,
  maxTitleLength: 200,
  validateTagFormat: true
});

// 批量操作
const knowledges = await customService.createKnowledges([
  { title: '文档1' },
  { title: '文档2' }
]);

// 按标签筛选
const taggedKnowledges = await customService.getKnowledgesByTags(['学习', '笔记']);
```

### 命令系统

#### 查询命令（不支持撤销）

```typescript
import { ListKnowledgesCommand, SearchKnowledgesCommand } from '@lavel/knowledge';

const listCommand = new ListKnowledgesCommand();
const searchCommand = new SearchKnowledgesCommand();

// 执行命令
const context = {
  args: { page: 1, limit: 10 },
  env: {}
};

const result = await listCommand.execute(context);
```

#### 修改命令（支持撤销）

```typescript
import { 
  CreateKnowledgeCommand, 
  UpdateKnowledgeMetadataCommand,
  DeleteKnowledgeCommand 
} from '@lavel/knowledge';

const createCommand = new CreateKnowledgeCommand();

// 执行创建命令
const context = {
  args: {
    title: '新知识文档',
    description: '描述'
  },
  env: {}
};

const result = await createCommand.execute(context);

// 撤销操作
const snapshot = { context };
const undoResult = await createCommand.undo(snapshot);
```

## 高级功能

### 批量标签操作

```typescript
import { batchUpdateKnowledgeTags } from '@lavel/knowledge';

// 批量添加标签
const updated = await batchUpdateKnowledgeTags(
  ['knowledge-1', 'knowledge-2'],
  ['新标签'],
  'add'
);

// 批量删除标签
const updated = await batchUpdateKnowledgeTags(
  ['knowledge-1', 'knowledge-2'],
  ['旧标签'],
  'remove'
);

// 批量替换标签
const updated = await batchUpdateKnowledgeTags(
  ['knowledge-1', 'knowledge-2'],
  ['标签1', '标签2'],
  'replace'
);
```

### 搜索并导出

```typescript
import { searchAndExportKnowledges } from '@lavel/knowledge';

const exports = await searchAndExportKnowledges('搜索关键词', {
  include_metadata: true,
  include_backlinks: true
});

exports.forEach(({ knowledge, markdown }) => {
  console.log(`文档: ${knowledge.title}`);
  console.log(`内容: ${markdown}`);
});
```

### 知识图谱分析

```typescript
import { analyzeKnowledgeGraph } from '@lavel/knowledge';

const graph = await analyzeKnowledgeGraph('start-knowledge-id', 3);

console.log('节点:', graph.nodes);
console.log('边:', graph.edges);

// 可用于绘制知识图谱
graph.edges.forEach(edge => {
  console.log(`${edge.from} --${edge.type}--> ${edge.to}`);
});
```

## 配置选项

### API 配置

```typescript
interface ApiConfig {
  baseUrl: string;              // API 基础URL
  timeout?: number;             // 请求超时时间（毫秒）
  headers?: Record<string, string>; // 自定义请求头
}
```

### 服务配置

```typescript
interface KnowledgeServiceConfig {
  api?: KnowledgeApi;           // 自定义 API 实例
  validateOnCreate?: boolean;   // 创建时是否验证
  validateOnUpdate?: boolean;   // 更新时是否验证
  autoGenerateIds?: boolean;    // 是否自动生成ID
}
```

### 验证规则

```typescript
interface KnowledgeValidationRules {
  minTitleLength?: number;      // 标题最小长度
  maxTitleLength?: number;      // 标题最大长度
  maxDescriptionLength?: number; // 描述最大长度
  allowEmptyTitle?: boolean;    // 是否允许空标题
  maxLinkedBlocks?: number;     // 最大链接 blocks 数量
  validateTagFormat?: boolean;  // 是否验证标签格式
}
```

## 错误处理

### API 错误

```typescript
import { KnowledgeApiError } from '@lavel/knowledge';

try {
  await api.getKnowledge('nonexistent-id');
} catch (error) {
  if (error instanceof KnowledgeApiError) {
    console.log('状态码:', error.status);
    console.log('错误信息:', error.message);
    console.log('原始响应:', error.response);
  }
}
```

### 服务错误

```typescript
import { KnowledgeServiceError } from '@lavel/knowledge';

try {
  await service.createKnowledge({ title: '' }); // 空标题
} catch (error) {
  if (error instanceof KnowledgeServiceError) {
    console.log('错误代码:', error.code);
    console.log('错误信息:', error.message);
    console.log('原因:', error.cause);
  }
}
```

## 测试

### 运行测试

```bash
cd packages/core/knowledge

# 运行所有测试
pnpm test

# 监听模式
pnpm test:watch

# 生成覆盖率报告
pnpm test:coverage
```

### 测试覆盖范围

- API 客户端功能测试
- 服务层业务逻辑测试
- 命令系统集成测试
- 撤销功能测试
- 错误处理测试
- 性能测试

## 开发指南

### 项目结构

```
packages/core/knowledge/
├── model/                    # 数据模型定义
│   └── knowledge.model.ts
├── api/                      # API 客户端
│   └── knowledge.api.ts
├── service/                  # 业务逻辑服务
│   └── knowledge.service.ts
├── command/                  # 命令系统集成
│   └── knowledge.commands.ts
├── test/                     # 测试文件
│   └── knowledge.test.ts
├── index.ts                  # 模块入口
├── package.json              # 包配置
├── tsconfig.json            # TypeScript 配置
└── README.md                # 文档
```

### 添加新功能

1. **数据模型**: 在 `model/knowledge.model.ts` 中定义新的接口
2. **API 方法**: 在 `api/knowledge.api.ts` 中添加 HTTP 客户端方法
3. **业务逻辑**: 在 `service/knowledge.service.ts` 中实现业务逻辑
4. **命令定义**: 在 `command/knowledge.commands.ts` 中创建命令类
5. **测试**: 在 `test/knowledge.test.ts` 中添加相应测试
6. **导出**: 在 `index.ts` 中导出新功能

### 代码规范

- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
- 编写完整的 JSDoc 注释
- 为所有公共 API 编写测试
- 为修改操作实现撤销功能

## 与其他模块的集成

### 与 Block 模块

```typescript
import { blockService } from '@lavel/block';
import { knowledgeService } from '@lavel/knowledge';

// 链接 knowledge 和 block
await knowledgeService.linkBlockToKnowledge('knowledge-id', {
  block_id: 'block-id',
  position: 0
});

// 通过 block 查找 knowledge
const block = await blockService.getBlock('block-id');
// 可以通过 block 的关系找到相关 knowledge
```

### 与命令系统

```typescript
import { CommandDispatcher } from '@lavel/command-system';
import { registerKnowledgeCommands } from '@lavel/knowledge';

const dispatcher = new CommandDispatcher();
registerKnowledgeCommands(dispatcher);

// 执行命令
const result = await dispatcher.execute('knowledge:create', {
  title: '通过命令创建的知识文档'
});
```

### 与撤销系统

```typescript
import { UndoManager } from '@lavel/undo-system';
import { getUndoableKnowledgeCommands } from '@lavel/knowledge';

const undoManager = new UndoManager();

// 注册可撤销命令
getUndoableKnowledgeCommands().forEach(command => {
  undoManager.registerCommand(command);
});

// 执行撤销
await undoManager.undo();
```

## 性能优化

### 批量操作

```typescript
// 推荐：使用批量操作
const knowledges = await service.createKnowledges(requests);

// 不推荐：循环单个操作
const results = [];
for (const request of requests) {
  results.push(await service.createKnowledge(request));
}
```

### 缓存策略

```typescript
// 实现自定义缓存
class CachedKnowledgeService extends KnowledgeService {
  private cache = new Map();

  async getKnowledge(id: string) {
    if (this.cache.has(id)) {
      return this.cache.get(id);
    }
    
    const knowledge = await super.getKnowledge(id);
    this.cache.set(id, knowledge);
    return knowledge;
  }
}
```

## 版本历史

### v1.0.0
- 🎉 初始版本发布
- ✅ 完整的 CRUD 操作支持
- ✅ 搜索和筛选功能
- ✅ 反向链接系统
- ✅ Markdown 导出
- ✅ 命令系统集成
- ✅ 撤销/重做支持

## 许可证

ISC License

## 贡献

欢迎提交 Issue 和 Pull Request！

---

更多信息请查看 [Lavel 项目文档](../../README.md) 