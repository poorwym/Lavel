/**
 * 撤销系统入口模块
 */

// 导出所有类型定义
export * from './types';

// 导出核心类
export { UndoManager, createUndoManager } from './undo-manager';

// 导出中间件
export {
  createUndoMiddleware,
  createTransactionMiddleware,
  createHistoryLimitMiddleware,
  createUndoAwareMiddleware,
  createCombinedUndoMiddleware
} from './middleware';

// 导出内置命令
export {
  undoCommand,
  redoCommand,
  undoHistoryCommand,
  clearHistoryCommand,
  beginTransactionCommand,
  commitTransactionCommand,
  rollbackTransactionCommand,
  undoStatusCommand,
  undoCommands,
  UndoCommandLoader
} from './commands';

// 导入依赖
import { CommandSystem } from '@lavel/command-system';
import { UndoManager, createUndoManager } from './undo-manager';
import { 
  createCombinedUndoMiddleware
} from './middleware';
import { UndoCommandLoader } from './commands';
import { IUndoManagerConfig, IUndoableCommand, ICommandSnapshot } from './types';

/**
 * 撤销系统配置
 */
export interface IUndoSystemConfig extends IUndoManagerConfig {
  /**
   * 是否自动注册撤销命令
   */
  autoRegisterCommands?: boolean;
  
  /**
   * 是否自动应用撤销中间件
   */
  autoApplyMiddleware?: boolean;
  
  /**
   * 中间件配置
   */
  middlewareConfig?: {
    autoRecord?: boolean;
    filter?: (command: any, context: any) => boolean;
    transformSnapshot?: (snapshot: ICommandSnapshot) => ICommandSnapshot;
  };
}

/**
 * 撤销系统集成类
 * 提供与命令系统的无缝集成
 */
export class UndoSystem {
  private commandSystem: CommandSystem;
  private undoManager: UndoManager;
  private config: IUndoSystemConfig;

  constructor(commandSystem: CommandSystem, config: IUndoSystemConfig = {}) {
    this.commandSystem = commandSystem;
    this.config = {
      autoRegisterCommands: true,
      autoApplyMiddleware: true,
      ...config
    };

    // 创建撤销管理器
    this.undoManager = createUndoManager(config);

    // 自动注册撤销命令
    if (this.config.autoRegisterCommands) {
      this.registerCommands();
    }

    // 自动应用中间件
    if (this.config.autoApplyMiddleware) {
      this.applyMiddleware();
    }
  }

  /**
   * 获取撤销管理器
   */
  getUndoManager(): UndoManager {
    return this.undoManager;
  }

  /**
   * 注册撤销命令
   */
  registerCommands(): void {
    UndoCommandLoader.registerAllCommands(this.commandSystem);
  }

  /**
   * 应用撤销中间件
   */
  applyMiddleware(): void {
    const middlewares = createCombinedUndoMiddleware(
      this.undoManager,
      this.config.middlewareConfig
    );

    middlewares.forEach(middleware => {
      this.commandSystem.use(middleware);
    });
  }

  /**
   * 创建可撤销命令的辅助方法
   */
  static createUndoableCommand(
    baseCommand: any,
    undoFunction: (snapshot: ICommandSnapshot) => any
  ): IUndoableCommand {
    return {
      ...baseCommand,
      undoable: true,
      undo: undoFunction
    };
  }

  /**
   * 执行撤销
   */
  async undo(): Promise<boolean> {
    return this.undoManager.undo();
  }

  /**
   * 执行重做
   */
  async redo(): Promise<boolean> {
    return this.undoManager.redo();
  }

  /**
   * 开始事务
   */
  beginTransaction(name: string, description?: string): string {
    return this.undoManager.beginTransaction(name, description);
  }

  /**
   * 提交事务
   */
  commitTransaction(transactionId: string): void {
    this.undoManager.commitTransaction(transactionId);
  }

  /**
   * 回滚事务
   */
  rollbackTransaction(transactionId: string): void {
    this.undoManager.rollbackTransaction(transactionId);
  }
}

/**
 * 创建撤销系统实例
 */
export const createUndoSystem = (
  commandSystem: CommandSystem, 
  config?: IUndoSystemConfig
): UndoSystem => {
  return new UndoSystem(commandSystem, config);
};

/**
 * 便捷的装饰器，用于标记命令为可撤销
 */
export function Undoable(undoFunction?: (snapshot: ICommandSnapshot) => any) {
  return function(_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = function(...args: any[]) {
      const command = {
        ...this,
        undoable: true,
        undo: undoFunction
      };
      
      return originalMethod.apply(command, args);
    };
    
    return descriptor;
  };
}

/**
 * 创建简单的值变更命令
 */
export function createValueChangeCommand(
  name: string,
  description: string,
  getValue: () => any,
  setValue: (value: any) => void
): IUndoableCommand {
  return {
    name,
    description,
    category: 'value-change',
    undoable: true,
    
    parameters: [
      {
        name: 'newValue',
        description: '新值',
        type: 'string',
        required: true
      }
    ],
    
    execute: async (context) => {
      const { newValue } = context.args;
      const oldValue = getValue();
      
      // 存储旧值到上下文
      context.env.previousState = { oldValue };
      
      // 设置新值
      setValue(newValue);
      
      return {
        success: true,
        data: {
          oldValue,
          newValue
        }
      };
    },
    
    undo: async (snapshot) => {
      const { oldValue } = snapshot.previousState || {};
      
      if (oldValue !== undefined) {
        setValue(oldValue);
        
        return {
          success: true,
          data: {
            restoredValue: oldValue
          }
        };
      }
      
      return {
        success: false,
        error: '无法恢复原值'
      };
    }
  };
}

/**
 * 创建批量操作的辅助函数
 */
export async function executeBatchWithUndo(
  commandSystem: CommandSystem,
  undoManager: UndoManager,
  operations: Array<{ name: string; args: any }>,
  transactionName: string
): Promise<any[]> {
  const transactionId = undoManager.beginTransaction(transactionName);
  
  try {
    const results = [];
    
    for (const { name, args } of operations) {
      const result = await commandSystem.execute(name, {
        args,
        env: { 
          undoManager,
          currentCommand: commandSystem.getCommand(name)
        }
      });
      
      if (!result.success) {
        throw new Error(`命令 ${name} 执行失败: ${result.error}`);
      }
      
      results.push(result);
    }
    
    undoManager.commitTransaction(transactionId);
    return results;
    
  } catch (error) {
    undoManager.rollbackTransaction(transactionId);
    throw error;
  }
} 