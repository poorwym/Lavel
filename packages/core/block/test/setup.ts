/**
 * 测试环境设置
 */

import { vi } from 'vitest';

// 模拟 fetch API
global.fetch = vi.fn();

// 模拟命令系统和撤销系统
vi.mock('@lavel/command-system', () => ({
  CommandSystem: vi.fn().mockImplementation(() => ({
    register: vi.fn(),
    execute: vi.fn(),
    use: vi.fn()
  })),
  createCommandSystem: vi.fn()
}));

vi.mock('@lavel/undo-system', () => ({
  createUndoSystem: vi.fn().mockImplementation(() => ({
    undo: vi.fn(),
    redo: vi.fn(),
    beginTransaction: vi.fn(),
    commitTransaction: vi.fn(),
    rollbackTransaction: vi.fn(),
    getUndoManager: vi.fn()
  }))
}));

// 重置所有 mocks
beforeEach(() => {
  vi.clearAllMocks();
}); 