# @lavel/undo-system

一个功能强大、类型安全的撤销/重做系统，为 [Lavel](https://github.com/lavel/lavel) 项目提供完整的撤销功能支持。

## ✨ 特性

- 🔄 **完整的撤销/重做功能** - 支持单步和批量撤销/重做操作
- 📦 **事务支持** - 将相关操作组织为原子单元，支持批量撤销
- 🎯 **类型安全** - 完整的 TypeScript 支持，提供优秀的 IDE 体验
- ⚡ **高性能** - 优化的内存使用和快速的操作执行
- 🔧 **灵活配置** - 丰富的配置选项和自定义能力
- 🧩 **中间件架构** - 与 @lavel/command-system 无缝集成
- 📊 **事件系统** - 完整的事件通知机制
- 💾 **持久化支持** - 可选的历史记录持久化
- 🛡️ **错误处理** - 健壮的错误恢复机制

## 📦 安装

```bash
npm install @lavel/undo-system
```

## 🚀 快速开始

### 基础使用

```typescript
import { createUndoSystem } from '@lavel/undo-system';
import { CommandSystem } from '@lavel/command-system';

// 创建命令系统和撤销系统
const commandSystem = new CommandSystem();
const undoSystem = createUndoSystem(commandSystem, {
  historyLimit: 100,
  debug: true
});

// 定义一个可撤销的命令
const editCommand = {
  name: 'editText',
  description: '编辑文本',
  undoable: true,
  
  execute: async (context) => {
    const { newText } = context.args;
    const oldText = getCurrentText(); // 获取当前文本
    
    // 保存旧状态用于撤销
    context.env.previousState = { oldText };
    
    // 执行操作
    setCurrentText(newText);
    
    return { success: true, data: { newText } };
  },
  
  undo: async (snapshot) => {
    const { oldText } = snapshot.previousState;
    setCurrentText(oldText);
    return { success: true };
  }
};

// 注册命令
commandSystem.register(editCommand);

// 执行命令（会自动记录到撤销历史）
await commandSystem.execute('editText', { newText: 'Hello World' });

// 撤销操作
await undoSystem.undo(); // 恢复到之前的文本
```

### 使用事务

```typescript
// 开始事务
const txId = undoSystem.beginTransaction('batchEdit', '批量文本编辑');

try {
  // 执行多个相关操作
  await commandSystem.execute('editText', { newText: 'Line 1' });
  await commandSystem.execute('editText', { newText: 'Line 2' });
  await commandSystem.execute('editText', { newText: 'Line 3' });
  
  // 提交事务
  undoSystem.commitTransaction(txId);
  
  console.log('批量编辑完成');
} catch (error) {
  // 出错时回滚整个事务
  undoSystem.rollbackTransaction(txId);
  console.error('批量编辑失败，已回滚:', error);
}

// 现在可以一次性撤销所有操作
await undoSystem.undo();
```

## 📖 API 文档

### 核心类型

#### IUndoableCommand
扩展基础命令接口，添加撤销功能支持：

```typescript
interface IUndoableCommand extends ICommand {
  undoable?: boolean;
  undo?: (snapshot: ICommandSnapshot) => Promise<ICommandResult>;
  redo?: (snapshot: ICommandSnapshot) => Promise<ICommandResult>;
  getUndoDescription?: (snapshot: ICommandSnapshot) => string;
}
```

#### ICommandSnapshot
命令执行的快照，包含执行上下文和状态：

```typescript
interface ICommandSnapshot {
  id: string;
  commandName: string;
  context: ICommandContext;
  result: ICommandResult;
  timestamp: number;
  command?: IUndoableCommand;
  previousState?: any;
  currentState?: any;
  metadata?: Record<string, any>;
}
```

### 撤销管理器

#### UndoManager

```typescript
class UndoManager {
  // 记录命令快照
  record(snapshot: ICommandSnapshot): void;
  
  // 撤销/重做操作
  undo(): Promise<boolean>;
  redo(): Promise<boolean>;
  undoMany(steps: number): Promise<number>;
  redoMany(steps: number): Promise<number>;
  
  // 状态查询
  canUndo(): boolean;
  canRedo(): boolean;
  getUndoHistory(): ICommandSnapshot[];
  getRedoHistory(): ICommandSnapshot[];
  
  // 历史管理
  clear(): void;
  getHistoryLimit(): number;
  setHistoryLimit(limit: number): void;
  
  // 事务管理
  beginTransaction(name: string, description?: string): string;
  commitTransaction(transactionId: string): void;
  rollbackTransaction(transactionId: string): void;
  getCurrentTransaction(): ITransaction | null;
}
```

### 系统集成类

#### UndoSystem

```typescript
class UndoSystem {
  constructor(commandSystem: CommandSystem, config?: IUndoSystemConfig);
  
  // 撤销操作
  undo(): Promise<boolean>;
  redo(): Promise<boolean>;
  
  // 事务管理
  beginTransaction(name: string, description?: string): string;
  commitTransaction(transactionId: string): void;
  rollbackTransaction(transactionId: string): void;
  
  // 系统管理
  getUndoManager(): UndoManager;
  registerCommands(): void;
  applyMiddleware(): void;
}
```

## 🔧 配置选项

### 撤销管理器配置

```typescript
const config: IUndoManagerConfig = {
  // 历史记录大小限制
  historyLimit: 100,
  
  // 是否启用调试日志
  debug: false,
  
  // 是否启用事务支持
  enableTransactions: true,
  
  // 撤销失败时的错误处理
  onUndoError: (error, snapshot) => {
    console.error(`撤销失败 [${snapshot.commandName}]:`, error);
  },
  
  // 重做失败时的错误处理
  onRedoError: (error, snapshot) => {
    console.error(`重做失败 [${snapshot.commandName}]:`, error);
  },
  
  // 是否自动清理过期事务
  autoCleanupTransactions: true,
  
  // 事务超时时间（毫秒）
  transactionTimeout: 60000
};
```

### 系统集成配置

```typescript
const systemConfig: IUndoSystemConfig = {
  ...config, // 包含撤销管理器的所有配置
  
  // 是否自动注册撤销命令
  autoRegisterCommands: true,
  
  // 是否自动应用中间件
  autoApplyMiddleware: true,
  
  // 中间件配置
  middlewareConfig: {
    autoRecord: true,
    filter: (command) => command.category !== 'query',
    transformSnapshot: (snapshot) => {
      // 清理敏感信息
      const cleaned = { ...snapshot };
      if (cleaned.context.args.password) {
        cleaned.context.args.password = '[REDACTED]';
      }
      return cleaned;
    }
  }
};
```

## 🧩 中间件系统

撤销系统提供了丰富的中间件来增强功能：

### 基础撤销中间件

```typescript
import { createUndoMiddleware } from '@lavel/undo-system';

const middleware = createUndoMiddleware({
  undoManager,
  autoRecord: true,
  
  // 过滤不需要记录的命令
  filter: (command, context) => {
    return command.undoable !== false && 
           !command.name.startsWith('query-');
  },
  
  // 转换快照数据
  transformSnapshot: (snapshot) => {
    // 移除敏感信息
    const cleaned = { ...snapshot };
    if (cleaned.context.args.password) {
      cleaned.context.args.password = '***';
    }
    return cleaned;
  }
});

commandSystem.use(middleware);
```

### 事务感知中间件

```typescript
import { createTransactionMiddleware } from '@lavel/undo-system';

const transactionMiddleware = createTransactionMiddleware(undoManager);
commandSystem.use(transactionMiddleware);
```

### 性能监控中间件

```typescript
import { createPerformanceMiddleware } from '@lavel/undo-system';

const performanceMiddleware = createPerformanceMiddleware({
  slowCommandThreshold: 1000,
  onSlowCommand: (command, duration) => {
    console.warn(`慢命令检测: ${command.name} 耗时 ${duration}ms`);
  }
});

commandSystem.use(performanceMiddleware);
```

### 组合中间件

```typescript
import { createCombinedUndoMiddleware } from '@lavel/undo-system';

const middlewares = createCombinedUndoMiddleware(undoManager, {
  autoRecord: true,
  enablePerformanceMonitoring: true,
  enableErrorRecovery: true,
  enableHistoryLimitWarning: true,
  slowCommandThreshold: 500,
  historyWarningThreshold: 0.8
});

// 批量应用中间件
middlewares.forEach(middleware => {
  commandSystem.use(middleware);
});
```

## 🎯 内置命令

撤销系统提供了一套完整的内置命令：

### 基础命令

```typescript
// 撤销操作
await commandSystem.execute('undo');
await commandSystem.execute('undo', { steps: 3 }); // 批量撤销

// 重做操作
await commandSystem.execute('redo');
await commandSystem.execute('redo', { steps: 2 }); // 批量重做

// 查看状态
const status = await commandSystem.execute('undo:status');
console.log(status.data);
```

### 历史管理命令

```typescript
// 查看撤销历史
const history = await commandSystem.execute('undo:history', {
  limit: 20,
  type: 'undo'
});

// 清空历史（需要确认）
await commandSystem.execute('undo:clear', { confirm: 'yes' });
```

### 事务命令

```typescript
// 开始事务
const txResult = await commandSystem.execute('undo:begin-transaction', {
  name: 'batchOperation',
  description: '批量操作'
});
const txId = txResult.data.transactionId;

// 提交事务
await commandSystem.execute('undo:commit-transaction', { transactionId: txId });

// 回滚事务
await commandSystem.execute('undo:rollback-transaction', { transactionId: txId });
```

## 📊 事件系统

撤销系统提供了完整的事件通知机制：

```typescript
const undoManager = undoSystem.getUndoManager();

// 监听撤销操作
undoManager.on('undo.executed', (event) => {
  console.log(`撤销了命令: ${event.snapshot?.commandName}`);
  updateUndoButton();
});

// 监听重做操作
undoManager.on('redo.executed', (event) => {
  console.log(`重做了命令: ${event.snapshot?.commandName}`);
  updateRedoButton();
});

// 监听事务操作
undoManager.on('transaction.committed', (event) => {
  console.log(`事务已提交: ${event.transaction?.name}`);
});

// 监听错误事件
undoManager.on('undo.failed', (event) => {
  console.error('撤销失败:', event.error?.message);
  showErrorNotification(event.error?.message);
});

// 监听历史清空
undoManager.on('history.cleared', (event) => {
  console.log('撤销历史已清空');
  updateHistoryUI();
});
```

### 可用事件类型

- `undo.executed` - 撤销操作成功执行
- `undo.failed` - 撤销操作执行失败
- `redo.executed` - 重做操作成功执行
- `redo.failed` - 重做操作执行失败
- `history.cleared` - 历史记录已清空
- `snapshot.recorded` - 新的命令快照已记录
- `transaction.started` - 事务已开始
- `transaction.committed` - 事务已提交
- `transaction.aborted` - 事务已回滚

## 💡 最佳实践

### 1. 命令设计

**✅ 推荐：**
```typescript
const command = {
  name: 'updateUser',
  undoable: true,
  
  execute: async (context) => {
    const { userId, updates } = context.args;
    const user = await getUser(userId);
    
    // 保存完整的旧状态
    context.env.previousState = { 
      userId, 
      oldData: { ...user } 
    };
    
    const updatedUser = await updateUser(userId, updates);
    
    // 可选：保存新状态用于优化重做
    context.env.currentState = { 
      userId, 
      newData: { ...updatedUser } 
    };
    
    return { success: true, data: updatedUser };
  },
  
  undo: async (snapshot) => {
    const { userId, oldData } = snapshot.previousState;
    await updateUser(userId, oldData);
    return { success: true };
  },
  
  redo: async (snapshot) => {
    // 可选：提供优化的重做逻辑
    const { userId, newData } = snapshot.currentState;
    await updateUser(userId, newData);
    return { success: true };
  }
};
```

**❌ 避免：**
```typescript
// 不要忘记保存状态
const badCommand = {
  execute: async (context) => {
    await updateUser(context.args.userId, context.args.updates);
    // ❌ 没有保存 previousState，无法撤销
    return { success: true };
  }
};
```

### 2. 事务使用

**✅ 推荐：**
```typescript
async function batchUpdate(updates) {
  const txId = undoSystem.beginTransaction('batchUpdate');
  
  try {
    for (const update of updates) {
      const result = await commandSystem.execute('updateItem', update);
      if (!result.success) {
        throw new Error(`更新失败: ${result.error}`);
      }
    }
    
    undoSystem.commitTransaction(txId);
    return { success: true };
  } catch (error) {
    undoSystem.rollbackTransaction(txId);
    throw error;
  }
}
```

### 3. 内存优化

```typescript
// 为大型对象实现智能状态保存
const smartCommand = {
  execute: async (context) => {
    const { targetId, changes } = context.args;
    const target = await getTarget(targetId);
    
    // 只保存实际变更的字段
    const previousState = {};
    for (const key in changes) {
      if (target[key] !== changes[key]) {
        previousState[key] = target[key];
      }
    }
    
    context.env.previousState = { targetId, changes: previousState };
    
    await updateTarget(targetId, changes);
    return { success: true };
  },
  
  undo: async (snapshot) => {
    const { targetId, changes } = snapshot.previousState;
    await updateTarget(targetId, changes);
    return { success: true };
  }
};
```

### 4. 错误处理

```typescript
const robustCommand = {
  execute: async (context) => {
    try {
      // 执行操作
      const result = await performOperation(context.args);
      
      // 验证结果
      if (!isValidResult(result)) {
        throw new Error('操作结果无效');
      }
      
      return { success: true, data: result };
    } catch (error) {
      // 记录错误信息
      console.error('Command execution failed:', error);
      
      // 清理部分完成的操作
      await cleanupPartialOperation(context.args);
      
      return { 
        success: false, 
        error: error.message 
      };
    }
  },
  
  undo: async (snapshot) => {
    try {
      await revertOperation(snapshot.previousState);
      return { success: true };
    } catch (error) {
      console.error('Undo failed:', error);
      return { 
        success: false, 
        error: `撤销失败: ${error.message}` 
      };
    }
  }
};
```

## 🔧 高级功能

### 自定义快照转换

```typescript
const undoSystem = createUndoSystem(commandSystem, {
  middlewareConfig: {
    transformSnapshot: (snapshot) => {
      const transformed = { ...snapshot };
      
      // 压缩大型数据
      if (transformed.previousState?.largeData) {
        transformed.previousState.largeData = compress(
          transformed.previousState.largeData
        );
      }
      
      // 移除敏感信息
      if (transformed.context.args.password) {
        transformed.context.args.password = '[REDACTED]';
      }
      
      // 添加额外元数据
      transformed.metadata = {
        ...transformed.metadata,
        version: '1.0',
        compressed: true
      };
      
      return transformed;
    }
  }
});
```

### 持久化历史

```typescript
import { IUndoPersistence } from '@lavel/undo-system';

class FileUndoPersistence implements IUndoPersistence {
  private filePath = './undo-history.json';
  
  async save(undoStack, redoStack) {
    const data = { undoStack, redoStack, timestamp: Date.now() };
    await fs.writeFile(this.filePath, JSON.stringify(data));
  }
  
  async load() {
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      const data = JSON.parse(content);
      return { 
        undoStack: data.undoStack || [], 
        redoStack: data.redoStack || [] 
      };
    } catch {
      return { undoStack: [], redoStack: [] };
    }
  }
  
  async clear() {
    await fs.unlink(this.filePath).catch(() => {});
  }
}

// 使用持久化
const persistence = new FileUndoPersistence();
const undoManager = createUndoManager({ persistence });
```

### 条件撤销

```typescript
const conditionalUndoMiddleware = createUndoMiddleware({
  undoManager,
  filter: (command, context) => {
    // 只记录用户操作，跳过系统操作
    if (command.category === 'system') return false;
    
    // 跳过只读操作
    if (command.name.startsWith('get-') || command.name.startsWith('list-')) {
      return false;
    }
    
    // 检查用户权限
    if (context.user?.role !== 'admin' && command.requireAuth) {
      return false;
    }
    
    return true;
  }
});
```

## 🧪 测试

```typescript
import { createUndoSystem, createUndoManager } from '@lavel/undo-system';

describe('UndoSystem', () => {
  let commandSystem;
  let undoSystem;
  
  beforeEach(() => {
    commandSystem = new CommandSystem();
    undoSystem = createUndoSystem(commandSystem);
  });
  
  test('should undo command execution', async () => {
    // 注册测试命令
    const testCommand = {
      name: 'test',
      undoable: true,
      execute: async (context) => {
        context.env.previousState = { value: 'old' };
        return { success: true, data: { value: 'new' } };
      },
      undo: async (snapshot) => {
        expect(snapshot.previousState.value).toBe('old');
        return { success: true };
      }
    };
    
    commandSystem.register(testCommand);
    
    // 执行命令
    await commandSystem.execute('test');
    expect(undoSystem.getUndoManager().canUndo()).toBe(true);
    
    // 撤销命令
    const success = await undoSystem.undo();
    expect(success).toBe(true);
    expect(undoSystem.getUndoManager().canUndo()).toBe(false);
  });
});
```

## 📈 性能考虑

1. **历史限制**：设置合理的历史记录限制以控制内存使用
2. **状态优化**：只保存必要的状态数据，避免大对象复制
3. **异步操作**：撤销/重做操作是异步的，可以处理耗时操作
4. **批量操作**：使用事务来组织相关操作，减少历史记录条目
5. **懒加载**：对于大型状态，考虑使用引用而非复制

## 🔗 相关链接

- [@lavel/command-system](../command-system) - 命令系统包
- [Lavel 项目](https://github.com/lavel/lavel) - 主项目仓库
- [API 文档](./docs/api.md) - 详细 API 文档
- [示例项目](./examples) - 完整示例代码

## 📄 许可证

MIT License - 查看 [LICENSE](../../LICENSE) 文件了解详情。

## 🤝 贡献

欢迎贡献代码！请查看 [CONTRIBUTING.md](../../CONTRIBUTING.md) 了解贡献指南。

## 🐛 问题报告

如果发现问题，请在 [GitHub Issues](https://github.com/lavel/lavel/issues) 中报告。 