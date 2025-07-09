# @lavel/undo-system

基于 @lavel/command-system 的完整撤销/重做系统实现。提供命令级别的撤销重做、事务支持、历史管理等功能。

## 特性

- 🔄 **完整的撤销/重做功能** - 支持单步和批量撤销/重做
- 📦 **事务支持** - 将多个操作组合为原子操作
- 🎯 **与命令系统无缝集成** - 通过中间件自动捕获可撤销命令
- 📝 **历史管理** - 查看、限制和清理历史记录
- 🔌 **灵活的扩展性** - 支持自定义撤销逻辑和事件监听
- 💾 **持久化支持** - 可保存和恢复撤销历史（接口已定义）

## 安装

```bash
npm install @lavel/undo-system
```

## 快速开始

### 1. 基本使用

```typescript
import { createCommandSystem } from '@lavel/command-system';
import { createUndoSystem } from '@lavel/undo-system';

// 创建命令系统
const commandSystem = createCommandSystem();

// 创建撤销系统
const undoSystem = createUndoSystem(commandSystem, {
  historyLimit: 100,  // 历史记录限制
  debug: true         // 启用调试日志
});

// 撤销系统会自动注册撤销命令和应用中间件
```

### 2. 创建可撤销命令

```typescript
import { IUndoableCommand } from '@lavel/undo-system';

const setValueCommand: IUndoableCommand = {
  name: 'setValue',
  description: '设置值',
  undoable: true,  // 标记为可撤销
  
  execute: async (context) => {
    const { key, newValue } = context.args;
    const oldValue = getValue(key);
    
    // 保存旧值用于撤销
    context.env.previousState = { key, oldValue };
    
    // 执行操作
    setValue(key, newValue);
    
    return { success: true, data: { key, newValue } };
  },
  
  undo: async (snapshot) => {
    const { key, oldValue } = snapshot.previousState;
    
    // 恢复旧值
    setValue(key, oldValue);
    
    return { success: true };
  }
};

// 注册命令
commandSystem.register(setValueCommand);
```

### 3. 执行撤销和重做

```typescript
// 执行一些操作
await commandSystem.execute('setValue', { 
  args: { key: 'name', newValue: '张三' } 
});

// 撤销
await commandSystem.execute('undo', {});

// 重做
await commandSystem.execute('redo', {});

// 批量撤销
await commandSystem.execute('undo', { args: { steps: 3 } });
```

## 高级功能

### 事务支持

事务允许您将多个操作组合为一个原子单元：

```typescript
// 开始事务
await commandSystem.execute('transaction:begin', {
  args: { name: '批量更新' }
});

// 执行多个操作
await commandSystem.execute('setValue', { 
  args: { key: 'name', newValue: '李四' } 
});
await commandSystem.execute('setValue', { 
  args: { key: 'age', newValue: 30 } 
});

// 提交事务
await commandSystem.execute('transaction:commit', {});

// 现在撤销会撤销整个事务
await commandSystem.execute('undo', {});
```

### 使用辅助函数

```typescript
import { createValueChangeCommand, executeBatchWithUndo } from '@lavel/undo-system';

// 创建简单的值变更命令
const configCommand = createValueChangeCommand(
  'config:set',
  '设置配置',
  () => getConfig(),      // 获取当前值
  (value) => setConfig(value)  // 设置新值
);

// 批量操作（自动事务）
await executeBatchWithUndo(
  commandSystem,
  undoSystem.getUndoManager(),
  [
    { name: 'setValue', args: { key: 'a', newValue: 1 } },
    { name: 'setValue', args: { key: 'b', newValue: 2 } },
    { name: 'setValue', args: { key: 'c', newValue: 3 } }
  ],
  '批量设置'
);
```

### 中间件配置

```typescript
const undoSystem = createUndoSystem(commandSystem, {
  middlewareConfig: {
    // 自动记录所有可撤销命令
    autoRecord: true,
    
    // 过滤要记录的命令
    filter: (command, context) => {
      // 不记录查询命令
      return !command.name.startsWith('get');
    },
    
    // 转换快照
    transformSnapshot: (snapshot) => {
      // 添加额外信息
      snapshot.metadata.userId = getCurrentUserId();
      return snapshot;
    }
  }
});
```

## 内置命令

### 撤销/重做命令

- `undo` - 撤销上一个操作
- `redo` - 重做上一个被撤销的操作
- `undo:history` - 查看撤销历史
- `undo:clear` - 清空撤销历史
- `undo:status` - 查看撤销系统状态

### 事务命令

- `transaction:begin` - 开始事务
- `transaction:commit` - 提交事务
- `transaction:rollback` - 回滚事务

## 事件监听

```typescript
const eventEmitter = undoSystem.getUndoManager().getEventEmitter();

// 监听撤销事件
eventEmitter.on('undo.executed', (event) => {
  console.log('撤销了:', event.snapshot.commandName);
});

// 监听重做事件
eventEmitter.on('redo.executed', (event) => {
  console.log('重做了:', event.snapshot.commandName);
});

// 监听事务事件
eventEmitter.on('transaction.committed', (event) => {
  console.log('事务已提交:', event.transaction.name);
});
```

## 实际示例

### 文本编辑器

```typescript
class TextEditor {
  private content = '';
  private commandSystem: any;
  private undoSystem: any;

  constructor() {
    this.commandSystem = createCommandSystem();
    this.undoSystem = createUndoSystem(this.commandSystem);
    this.registerCommands();
  }

  private registerCommands() {
    // 插入文本命令
    this.commandSystem.register({
      name: 'insert',
      undoable: true,
      
      execute: async (context) => {
        const { position, text } = context.args;
        
        // 保存状态
        context.env.previousState = { position, length: text.length };
        
        // 执行插入
        this.content = 
          this.content.slice(0, position) + 
          text + 
          this.content.slice(position);
        
        return { success: true };
      },
      
      undo: async (snapshot) => {
        const { position, length } = snapshot.previousState;
        
        // 删除插入的文本
        this.content = 
          this.content.slice(0, position) + 
          this.content.slice(position + length);
          
        return { success: true };
      }
    });
  }

  async insert(position: number, text: string) {
    await this.commandSystem.execute('insert', {
      args: { position, text }
    });
  }

  async undo() {
    await this.undoSystem.undo();
  }

  async redo() {
    await this.undoSystem.redo();
  }
}
```

### 表单编辑器

```typescript
// 为表单字段创建撤销功能
const formFields = ['name', 'email', 'phone'];

formFields.forEach(field => {
  const command = createValueChangeCommand(
    `form:${field}`,
    `更新${field}字段`,
    () => getFieldValue(field),
    (value) => setFieldValue(field, value)
  );
  
  commandSystem.register(command);
});

// 批量更新表单
async function updateForm(data: any) {
  const operations = Object.entries(data).map(([field, value]) => ({
    name: `form:${field}`,
    args: { newValue: value }
  }));
  
  await executeBatchWithUndo(
    commandSystem,
    undoSystem.getUndoManager(),
    operations,
    '更新表单'
  );
}
```

## API 文档

### UndoSystem 类

```typescript
class UndoSystem {
  constructor(commandSystem: CommandSystem, config?: IUndoSystemConfig);
  
  // 获取撤销管理器
  getUndoManager(): UndoManager;
  
  // 执行撤销
  undo(): Promise<boolean>;
  
  // 执行重做
  redo(): Promise<boolean>;
  
  // 事务操作
  beginTransaction(name: string, description?: string): string;
  commitTransaction(transactionId: string): void;
  rollbackTransaction(transactionId: string): void;
}
```

### UndoManager 类

```typescript
class UndoManager {
  // 记录命令执行
  record(snapshot: ICommandSnapshot): void;
  
  // 撤销/重做
  undo(): Promise<boolean>;
  redo(): Promise<boolean>;
  undoMany(steps: number): Promise<number>;
  redoMany(steps: number): Promise<number>;
  
  // 状态检查
  canUndo(): boolean;
  canRedo(): boolean;
  
  // 历史管理
  getUndoHistory(): ICommandSnapshot[];
  getRedoHistory(): ICommandSnapshot[];
  clear(): void;
  
  // 配置
  getHistoryLimit(): number;
  setHistoryLimit(limit: number): void;
}
```

### 类型定义

```typescript
// 可撤销命令
interface IUndoableCommand extends ICommand {
  undoable?: boolean;
  undo?: (snapshot: ICommandSnapshot) => Promise<ICommandResult> | ICommandResult;
  redo?: (snapshot: ICommandSnapshot) => Promise<ICommandResult> | ICommandResult;
  getUndoDescription?: (snapshot: ICommandSnapshot) => string;
}

// 命令快照
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

// 配置选项
interface IUndoSystemConfig {
  historyLimit?: number;
  debug?: boolean;
  enableTransactions?: boolean;
  autoRegisterCommands?: boolean;
  autoApplyMiddleware?: boolean;
  middlewareConfig?: {
    autoRecord?: boolean;
    filter?: (command: ICommand, context: ICommandContext) => boolean;
    transformSnapshot?: (snapshot: ICommandSnapshot) => ICommandSnapshot;
  };
}
```

## 最佳实践

1. **保存必要的状态** - 在 execute 方法中保存足够的信息用于撤销
2. **保持撤销操作简单** - 撤销逻辑应该是可靠和确定的
3. **使用事务** - 对于相关的多个操作，使用事务确保原子性
4. **限制历史大小** - 设置合理的历史限制避免内存问题
5. **处理错误** - 在撤销/重做失败时提供有意义的错误信息

## 许可证

ISC 