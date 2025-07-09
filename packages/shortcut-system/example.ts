/**
 * 快捷键系统使用示例
 */

import { 
  createCommandSystem, 
  ICommand, 
  ICommandContext, 
  ICommandResult 
} from '@lavel/command-system';
import { 
  createUndoSystem,
  UndoSystem
} from '@lavel/undo-system';
import {
  ShortcutSystem,
  createShortcutSystem,
  defaultShortcutSchemes,
  shortcutHelpers,
  IShortcut
} from './index';

// 创建命令系统
const commandSystem = createCommandSystem({
  debug: true,
  enableLogging: true
});

// 创建撤销系统
const undoSystem = createUndoSystem(commandSystem, {
  historyLimit: 50,
  debug: true
});

// 创建快捷键系统
const shortcutSystem = createShortcutSystem(commandSystem, {
  debug: true,
  platform: 'mac' // 或 'win', 'linux'
}, undoSystem);

// 定义一些示例命令
const sampleCommands: ICommand[] = [
  {
    name: 'save',
    description: '保存文件',
    category: 'file',
    execute: async (context: ICommandContext): Promise<ICommandResult> => {
      console.log('执行保存命令', context.args);
      return {
        success: true,
        data: { message: '文件已保存' }
      };
    }
  },
  {
    name: 'open',
    description: '打开文件',
    category: 'file',
    execute: async (context: ICommandContext): Promise<ICommandResult> => {
      console.log('执行打开命令', context.args);
      return {
        success: true,
        data: { message: '文件已打开' }
      };
    }
  },
  {
    name: 'copy',
    description: '复制',
    category: 'edit',
    execute: async (context: ICommandContext): Promise<ICommandResult> => {
      console.log('执行复制命令');
      return {
        success: true,
        data: { message: '已复制到剪贴板' }
      };
    }
  },
  {
    name: 'cut',
    description: '剪切',
    category: 'edit',
    execute: async (context: ICommandContext): Promise<ICommandResult> => {
      console.log('执行剪切命令');
      return {
        success: true,
        data: { message: '已剪切到剪贴板' }
      };
    }
  },
  {
    name: 'paste',
    description: '粘贴',
    category: 'edit',
    execute: async (context: ICommandContext): Promise<ICommandResult> => {
      console.log('执行粘贴命令');
      return {
        success: true,
        data: { message: '已粘贴' }
      };
    }
  },
  {
    name: 'selectAll',
    description: '全选',
    category: 'edit',
    execute: async (context: ICommandContext): Promise<ICommandResult> => {
      console.log('执行全选命令');
      return {
        success: true,
        data: { message: '已全选' }
      };
    }
  },
  {
    name: 'new',
    description: '新建',
    category: 'file',
    execute: async (context: ICommandContext): Promise<ICommandResult> => {
      console.log('执行新建命令');
      return {
        success: true,
        data: { message: '已创建新文件' }
      };
    }
  },
  {
    name: 'saveAs',
    description: '另存为',
    category: 'file',
    execute: async (context: ICommandContext): Promise<ICommandResult> => {
      console.log('执行另存为命令');
      return {
        success: true,
        data: { message: '文件已另存为' }
      };
    }
  }
];

// 注册命令
sampleCommands.forEach(cmd => commandSystem.register(cmd));

// 初始化快捷键系统
shortcutSystem.initialize();

// 方式1: 使用内置快捷键方案
console.log('\n=== 使用内置快捷键方案 ===');
// 跳过撤销/重做快捷键，因为已经自动注册
const textEditScheme = {
  name: 'textEdit',
  description: '文本编辑快捷键',
  shortcuts: [
    {
      id: 'copy',
      description: '复制',
      keys: 'c',
      modifiers: { ctrlOrCmd: true },
      commandName: 'copy',
      category: 'edit',
      priority: 90
    },
    {
      id: 'cut',
      description: '剪切',
      keys: 'x',
      modifiers: { ctrlOrCmd: true },
      commandName: 'cut',
      category: 'edit',
      priority: 90
    },
    {
      id: 'paste',
      description: '粘贴',
      keys: 'v',
      modifiers: { ctrlOrCmd: true },
      commandName: 'paste',
      category: 'edit',
      priority: 90
    }
  ]
};
shortcutSystem.registerScheme(textEditScheme);

// 方式2: 单独注册快捷键
console.log('\n=== 单独注册快捷键 ===');
const saveShortcut: IShortcut = {
  id: 'save-file',
  description: '保存当前文件',
  keys: 's',
  modifiers: { ctrlOrCmd: true },
  commandName: 'save',
  category: 'file',
  priority: 100
};
shortcutSystem.register(saveShortcut);

// 方式3: 使用助手函数创建快捷键
console.log('\n=== 使用助手函数创建快捷键 ===');
const openShortcut = shortcutHelpers.createShortcut(
  'open-file',
  'ctrl+o',
  'open',
  {
    description: '打开文件',
    category: 'file',
    commandArgs: { dialog: true }
  }
);
shortcutSystem.register(openShortcut);

// 方式4: 批量注册快捷键
console.log('\n=== 批量注册快捷键 ===');
const customShortcuts: IShortcut[] = [
  {
    id: 'quick-save',
    description: '快速保存',
    keys: 's',
    modifiers: { ctrl: true, shift: true },
    commandName: 'save',
    commandArgs: { quick: true },
    category: 'file'
  },
  {
    id: 'save-all',
    description: '保存所有',
    keys: 's',
    modifiers: { ctrl: true, alt: true },
    commandName: 'save',
    commandArgs: { all: true },
    category: 'file'
  }
];
shortcutSystem.registerBatch(customShortcuts);

// 显示所有注册的快捷键
console.log('\n=== 所有注册的快捷键 ===');
const allShortcuts = shortcutSystem.getAllShortcuts();
allShortcuts.forEach(shortcut => {
  const formatted = shortcutHelpers.formatShortcut(shortcut, 'mac');
  console.log(`${formatted} - ${shortcut.description} (${shortcut.commandName})`);
});

// 按分类显示快捷键
console.log('\n=== 文件操作快捷键 ===');
const fileShortcuts = shortcutSystem.getShortcutsByCategory('file');
fileShortcuts.forEach(shortcut => {
  const formatted = shortcutHelpers.formatShortcut(shortcut);
  console.log(`${formatted} - ${shortcut.description}`);
});

// 验证快捷键
console.log('\n=== 验证快捷键 ===');
const invalidShortcut: IShortcut = {
  id: 'invalid',
  description: '无效的快捷键',
  keys: 's',
  modifiers: { ctrlOrCmd: true },
  commandName: 'non-existent-command'
};

const validationResult = shortcutSystem.validateShortcut(invalidShortcut);
console.log('验证结果:', validationResult);

// 检查快捷键冲突
const conflictingShortcut: IShortcut = {
  id: 'conflict',
  description: '冲突的快捷键',
  keys: 's',
  modifiers: { ctrlOrCmd: true },
  commandName: 'save'
};

const conflictResult = shortcutSystem.validateShortcut(conflictingShortcut);
console.log('冲突检查:', conflictResult);

// 导出快捷键配置
console.log('\n=== 导出快捷键配置 ===');
const exportedScheme = shortcutSystem.exportShortcuts();
console.log('导出的方案:', exportedScheme);

// 禁用/启用快捷键
console.log('\n=== 禁用/启用快捷键 ===');
shortcutSystem.disable('save-file');
console.log('已禁用 save-file 快捷键');

shortcutSystem.enable('save-file');
console.log('已启用 save-file 快捷键');

// 模拟键盘事件（在浏览器环境中）
if (typeof window !== 'undefined') {
  console.log('\n=== 模拟键盘事件 ===');
  
  // 监听快捷键事件
  const eventEmitter = shortcutSystem.getManager().getEventEmitter();
  
  eventEmitter.on('shortcut.triggered', (event) => {
    console.log('快捷键触发:', event.shortcut?.id);
  });
  
  eventEmitter.on('shortcut.executed', (event) => {
    console.log('快捷键执行完成:', event.shortcut?.id, event.data?.result);
  });
  
  // 模拟按下 Ctrl+S
  const mockEvent = new KeyboardEvent('keydown', {
    key: 's',
    ctrlKey: true,
    bubbles: true
  });
  
  document.dispatchEvent(mockEvent);
}

// 清理资源
console.log('\n=== 清理资源 ===');
// shortcutSystem.destroy();
// console.log('快捷键系统已销毁');

// 高级用法：条件快捷键
console.log('\n=== 条件快捷键 ===');
const conditionalShortcut: IShortcut = {
  id: 'conditional-save',
  description: '条件保存',
  keys: 'd',
  modifiers: { ctrlOrCmd: true },
  commandName: 'save',
  category: 'file',
  when: (context) => {
    // 只在特定条件下生效
    return context.env.canSave === true;
  }
};

// 设置上下文
shortcutSystem.getManager().setContext({
  env: { canSave: true }
});

shortcutSystem.register(conditionalShortcut);
console.log('已注册条件快捷键');

// 统计信息
console.log('\n=== 统计信息 ===');
const stats = shortcutSystem.getManager().getRegistry().getStats();
console.log('快捷键统计:', stats);

// CommonJS导出
module.exports = {
  shortcutSystem,
  commandSystem,
  undoSystem
}; 