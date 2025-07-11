/**
 * 测试设置文件
 * 模拟外部依赖和全局配置
 */

import { vi } from 'vitest';

// 模拟 @lavel/command-system
vi.mock('@lavel/command-system', () => ({
  ICommand: class {},
  ICommandContext: class {},
  ICommandResult: class {},
  CommandDispatcher: class {
    register = vi.fn();
    execute = vi.fn();
  }
}));

// 模拟 @lavel/undo-system
vi.mock('@lavel/undo-system', () => ({
  IUndoableCommand: class {},
  ICommandSnapshot: class {},
  UndoManager: class {
    registerCommand = vi.fn();
    undo = vi.fn();
    redo = vi.fn();
  }
}));

// 设置全局 fetch 模拟
global.fetch = vi.fn();

// 设置全局错误处理
global.console.error = vi.fn();
global.console.warn = vi.fn(); 