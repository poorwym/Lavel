/**
 * 撤销系统使用示例
 */

import { 
  createCommandSystem, 
  ICommand, 
  ICommandContext, 
  ICommandResult 
} from '@lavel/command-system';
import { 
  createUndoSystem, 
  IUndoableCommand,
  ICommandSnapshot,
  createValueChangeCommand,
  executeBatchWithUndo
} from './index';

// 模拟一个简单的数据存储
class DataStore {
  private data: Record<string, any> = {};

  set(key: string, value: any): void {
    this.data[key] = value;
  }

  get(key: string): any {
    return this.data[key];
  }

  delete(key: string): void {
    delete this.data[key];
  }

  getAll(): Record<string, any> {
    return { ...this.data };
  }
}

// 创建数据存储实例
const store = new DataStore();

/**
 * 创建可撤销的设置值命令
 */
const setValueCommand: IUndoableCommand = {
  name: 'store:set',
  description: '在存储中设置键值对',
  category: 'store',
  undoable: true,
  
  parameters: [
    {
      name: 'key',
      description: '键名',
      type: 'string',
      required: true
    },
    {
      name: 'value',
      description: '值',
      type: 'string',
      required: true
    }
  ],
  
  execute: async (context: ICommandContext): Promise<ICommandResult> => {
    const { key, value } = context.args;
    
    // 保存旧值用于撤销
    const oldValue = store.get(key);
    const existed = oldValue !== undefined;
    
    // 执行操作
    store.set(key, value);
    
    // 保存状态用于撤销
    context.env.previousState = { key, oldValue, existed };
    
    return {
      success: true,
      data: {
        key,
        value,
        oldValue,
        action: existed ? 'updated' : 'created'
      }
    };
  },
  
  undo: async (snapshot: ICommandSnapshot): Promise<ICommandResult> => {
    const { key, oldValue, existed } = snapshot.previousState || {};
    
    if (!key) {
      return { success: false, error: '无法撤销：缺少必要的状态信息' };
    }
    
    if (existed) {
      // 恢复旧值
      store.set(key, oldValue);
    } else {
      // 删除新创建的键
      store.delete(key);
    }
    
    return {
      success: true,
      data: {
        key,
        restoredValue: oldValue,
        action: existed ? 'restored' : 'deleted'
      }
    };
  },
  
  getUndoDescription: (snapshot: ICommandSnapshot) => {
    const { key } = snapshot.context.args;
    return `撤销设置 "${key}" 的值`;
  }
};

/**
 * 创建可撤销的删除命令
 */
const deleteValueCommand: IUndoableCommand = {
  name: 'store:delete',
  description: '从存储中删除键值对',
  category: 'store',
  undoable: true,
  
  parameters: [
    {
      name: 'key',
      description: '要删除的键名',
      type: 'string',
      required: true
    }
  ],
  
  execute: async (context: ICommandContext): Promise<ICommandResult> => {
    const { key } = context.args;
    
    // 保存旧值用于撤销
    const oldValue = store.get(key);
    if (oldValue === undefined) {
      return {
        success: false,
        error: `键 "${key}" 不存在`
      };
    }
    
    // 执行删除
    store.delete(key);
    
    // 保存状态用于撤销
    context.env.previousState = { key, oldValue };
    
    return {
      success: true,
      data: { key, deletedValue: oldValue }
    };
  },
  
  undo: async (snapshot: ICommandSnapshot): Promise<ICommandResult> => {
    const { key, oldValue } = snapshot.previousState || {};
    
    if (!key || oldValue === undefined) {
      return { success: false, error: '无法撤销：缺少必要的状态信息' };
    }
    
    // 恢复删除的值
    store.set(key, oldValue);
    
    return {
      success: true,
      data: { key, restoredValue: oldValue }
    };
  }
};

/**
 * 创建批量导入命令（使用事务）
 */
const importDataCommand: ICommand = {
  name: 'store:import',
  description: '批量导入数据',
  category: 'store',
  
  parameters: [
    {
      name: 'data',
      description: '要导入的数据（键值对对象）',
      type: 'object',
      required: true
    }
  ],
  
  execute: async (context: ICommandContext): Promise<ICommandResult> => {
    const { data } = context.args;
    const undoSystem = context.env?.undoSystem;
    
    if (!undoSystem) {
      return { success: false, error: '撤销系统未初始化' };
    }
    
    // 开始事务
    const transactionId = undoSystem.beginTransaction('批量导入数据');
    
    try {
      const entries = Object.entries(data);
      
      for (const [key, value] of entries) {
        const result = await context.env.commandSystem.execute('store:set', {
          args: { key, value },
          env: { ...context.env }
        });
        
        if (!result.success) {
          throw new Error(`导入键 "${key}" 失败: ${result.error}`);
        }
      }
      
      // 提交事务
      undoSystem.commitTransaction(transactionId);
      
      return {
        success: true,
        data: {
          importedCount: entries.length,
          keys: Object.keys(data)
        }
      };
    } catch (error) {
      // 回滚事务
      undoSystem.rollbackTransaction(transactionId);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : '导入失败'
      };
    }
  }
};

/**
 * 执行示例
 */
async function runExamples() {
  console.log('=== 撤销系统使用示例 ===\n');

  // 1. 创建命令系统和撤销系统
  const commandSystem = createCommandSystem({
    debug: true,
    enableLogging: true
  });

  const undoSystem = createUndoSystem(commandSystem, {
    historyLimit: 50,
    debug: true,
    enableTransactions: true
  });

  // 2. 注册自定义命令
  commandSystem.register(setValueCommand);
  commandSystem.register(deleteValueCommand);
  commandSystem.register(importDataCommand);

  // 3. 创建执行命令的辅助函数
  const executeCommand = async (name: string, args: any) => {
    console.log(`\n执行命令: ${name}`, args);
    
    const result = await commandSystem.execute(name, {
      args,
      env: { 
        commandSystem,
        undoSystem,
        currentCommand: commandSystem.getCommand(name)
      }
    });
    
    console.log('结果:', result);
    console.log('当前数据:', store.getAll());
    
    return result;
  };

  // 4. 基本操作示例
  console.log('\n--- 基本操作示例 ---');
  
  await executeCommand('store:set', { key: 'name', value: '张三' });
  await executeCommand('store:set', { key: 'age', value: '25' });
  await executeCommand('store:set', { key: 'email', value: 'zhangsan@example.com' });
  
  // 5. 撤销操作
  console.log('\n--- 撤销操作 ---');
  
  await executeCommand('undo', {});
  console.log('撤销后的数据:', store.getAll());
  
  await executeCommand('undo', { steps: 2 });
  console.log('再撤销2步后的数据:', store.getAll());
  
  // 6. 重做操作
  console.log('\n--- 重做操作 ---');
  
  await executeCommand('redo', {});
  console.log('重做后的数据:', store.getAll());
  
  // 7. 查看历史
  console.log('\n--- 查看撤销历史 ---');
  
  await executeCommand('undo:history', { limit: 10, type: 'both' });
  
  // 8. 删除操作及撤销
  console.log('\n--- 删除操作示例 ---');
  
  await executeCommand('store:delete', { key: 'name' });
  await executeCommand('undo', {}); // 撤销删除
  
  // 9. 事务示例
  console.log('\n--- 事务示例 ---');
  
  // 手动事务
  await executeCommand('transaction:begin', { 
    name: '批量更新用户信息',
    description: '更新用户的多个字段'
  });
  
  await executeCommand('store:set', { key: 'name', value: '李四' });
  await executeCommand('store:set', { key: 'age', value: '30' });
  await executeCommand('store:set', { key: 'city', value: '北京' });
  
  await executeCommand('transaction:commit', {});
  
  // 撤销整个事务
  console.log('\n撤销整个事务:');
  await executeCommand('undo', {});
  console.log('撤销事务后的数据:', store.getAll());
  
  // 10. 批量导入（自动事务）
  console.log('\n--- 批量导入示例 ---');
  
  await executeCommand('store:import', {
    data: {
      product1: 'iPhone 15',
      product2: 'MacBook Pro',
      product3: 'iPad Air'
    }
  });
  
  // 11. 使用便捷函数创建命令
  console.log('\n--- 使用便捷函数 ---');
  
  let configValue = 'default';
  
  const configCommand = createValueChangeCommand(
    'config:set',
    '设置配置值',
    () => configValue,
    (value) => { configValue = value; }
  );
  
  commandSystem.register(configCommand);
  
  await executeCommand('config:set', { newValue: 'custom' });
  console.log('配置值:', configValue);
  
  await executeCommand('undo', {});
  console.log('撤销后的配置值:', configValue);
  
  // 12. 批量操作辅助函数
  console.log('\n--- 批量操作 ---');
  
  try {
    await executeBatchWithUndo(
      commandSystem,
      undoSystem.getUndoManager(),
      [
        { name: 'store:set', args: { key: 'batch1', value: 'value1' } },
        { name: 'store:set', args: { key: 'batch2', value: 'value2' } },
        { name: 'store:set', args: { key: 'batch3', value: 'value3' } }
      ],
      '批量设置'
    );
    
    console.log('批量操作后的数据:', store.getAll());
  } catch (error) {
    console.error('批量操作失败:', error);
  }
  
  // 13. 查看最终状态
  console.log('\n--- 最终状态 ---');
  
  await executeCommand('undo:status', {});
}

/**
 * 高级示例：创建一个文本编辑器的撤销系统
 */
class SimpleTextEditor {
  private content: string = '';
  private commandSystem: any;
  private undoSystem: any;

  constructor() {
    this.commandSystem = createCommandSystem();
    this.undoSystem = createUndoSystem(this.commandSystem);
    this.registerCommands();
  }

  private registerCommands() {
    // 插入文本命令
    const insertCommand: IUndoableCommand = {
      name: 'editor:insert',
      description: '插入文本',
      category: 'editor',
      undoable: true,
      
      parameters: [
        { name: 'position', description: '插入位置', type: 'number', required: true },
        { name: 'text', description: '要插入的文本', type: 'string', required: true }
      ],
      
      execute: async (context) => {
        const { position, text } = context.args;
        const before = this.content.substring(0, position);
        const after = this.content.substring(position);
        
        this.content = before + text + after;
        
        context.env.previousState = { position, length: text.length };
        
        return { success: true, data: { position, text } };
      },
      
      undo: async (snapshot) => {
        const { position, length } = snapshot.previousState || {};
        
        if (position !== undefined && length !== undefined) {
          const before = this.content.substring(0, position);
          const after = this.content.substring(position + length);
          this.content = before + after;
          
          return { success: true };
        }
        
        return { success: false, error: '无法撤销' };
      }
    };

    // 删除文本命令
    const deleteCommand: IUndoableCommand = {
      name: 'editor:delete',
      description: '删除文本',
      category: 'editor',
      undoable: true,
      
      parameters: [
        { name: 'position', description: '删除位置', type: 'number', required: true },
        { name: 'length', description: '删除长度', type: 'number', required: true }
      ],
      
      execute: async (context) => {
        const { position, length } = context.args;
        const deletedText = this.content.substring(position, position + length);
        
        const before = this.content.substring(0, position);
        const after = this.content.substring(position + length);
        this.content = before + after;
        
        context.env.previousState = { position, deletedText };
        
        return { success: true, data: { position, deletedText } };
      },
      
      undo: async (snapshot) => {
        const { position, deletedText } = snapshot.previousState || {};
        
        if (position !== undefined && deletedText) {
          const before = this.content.substring(0, position);
          const after = this.content.substring(position);
          this.content = before + deletedText + after;
          
          return { success: true };
        }
        
        return { success: false, error: '无法撤销' };
      }
    };

    this.commandSystem.register(insertCommand);
    this.commandSystem.register(deleteCommand);
  }

  async insert(position: number, text: string): Promise<void> {
    await this.commandSystem.execute('editor:insert', {
      args: { position, text },
      env: { 
        currentCommand: this.commandSystem.getCommand('editor:insert')
      }
    });
  }

  async delete(position: number, length: number): Promise<void> {
    await this.commandSystem.execute('editor:delete', {
      args: { position, length },
      env: {
        currentCommand: this.commandSystem.getCommand('editor:delete')
      }
    });
  }

  async undo(): Promise<void> {
    await this.undoSystem.undo();
  }

  async redo(): Promise<void> {
    await this.undoSystem.redo();
  }

  getContent(): string {
    return this.content;
  }
}

// 演示文本编辑器
async function demoTextEditor() {
  console.log('\n\n=== 文本编辑器撤销系统示例 ===\n');
  
  const editor = new SimpleTextEditor();
  
  console.log('初始内容:', `"${editor.getContent()}"`);
  
  await editor.insert(0, 'Hello ');
  console.log('插入 "Hello ":', `"${editor.getContent()}"`);
  
  await editor.insert(6, 'World');
  console.log('插入 "World":', `"${editor.getContent()}"`);
  
  await editor.insert(11, '!');
  console.log('插入 "!":', `"${editor.getContent()}"`);
  
  await editor.undo();
  console.log('撤销后:', `"${editor.getContent()}"`);
  
  await editor.undo();
  console.log('再撤销:', `"${editor.getContent()}"`);
  
  await editor.redo();
  console.log('重做:', `"${editor.getContent()}"`);
  
  await editor.delete(6, 5);
  console.log('删除 "World":', `"${editor.getContent()}"`);
  
  await editor.undo();
  console.log('撤销删除:', `"${editor.getContent()}"`);
}

// 主函数
async function main() {
  await runExamples();
  await demoTextEditor();
}

// 如果直接运行此文件，执行示例
if (require.main === module) {
  main().catch(console.error);
}

export { runExamples, SimpleTextEditor }; 