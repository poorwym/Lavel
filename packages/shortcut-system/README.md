# @lavel/shortcut-system

一个功能强大的快捷键管理系统，与 @lavel/command-system 和 @lavel/undo-system 无缝集成。

## 特性

- 🎯 **命令系统集成** - 直接绑定快捷键到命令系统的命令
- ↩️ **撤销系统集成** - 自动支持撤销/重做快捷键
- 🔧 **灵活配置** - 支持修饰键、优先级、条件执行等
- 📦 **快捷键方案** - 预定义快捷键方案，支持导入/导出
- 🌍 **跨平台支持** - 自动适配 Windows/Mac/Linux 平台差异
- 🎨 **事件系统** - 完整的事件监听和处理机制
- ✅ **冲突检测** - 自动检测和验证快捷键冲突

## 安装

```bash
npm install @lavel/shortcut-system
# 或
yarn add @lavel/shortcut-system
# 或
pnpm add @lavel/shortcut-system
```

## 快速开始

```typescript
import { createCommandSystem } from '@lavel/command-system';
import { createShortcutSystem } from '@lavel/shortcut-system';

// 创建命令系统
const commandSystem = createCommandSystem();

// 创建快捷键系统
const shortcutSystem = createShortcutSystem(commandSystem);

// 初始化
shortcutSystem.initialize();

// 注册快捷键
shortcutSystem.register({
  id: 'save',
  description: '保存文件',
  keys: 's',
  modifiers: { ctrlOrCmd: true },
  commandName: 'save',
  category: 'file'
});
```

## 核心概念

### 快捷键定义

```typescript
interface IShortcut {
  id: string;                    // 唯一标识符
  description: string;           // 描述
  keys: string;                  // 主键
  modifiers?: IKeyModifiers;     // 修饰键
  commandName: string;           // 绑定的命令名
  commandArgs?: any;             // 命令参数
  category?: string;             // 分类
  enabled?: boolean;             // 是否启用
  when?: (context) => boolean;   // 执行条件
  priority?: number;             // 优先级
}
```

### 修饰键

```typescript
interface IKeyModifiers {
  ctrlOrCmd?: boolean;  // Ctrl(Win/Linux) 或 Cmd(Mac)
  ctrl?: boolean;       // Ctrl键
  alt?: boolean;        // Alt键
  shift?: boolean;      // Shift键
  meta?: boolean;       // Meta键(Windows键/Cmd键)
}
```

## 使用示例

### 1. 基础使用

```typescript
// 注册单个快捷键
shortcutSystem.register({
  id: 'copy',
  description: '复制',
  keys: 'c',
  modifiers: { ctrlOrCmd: true },
  commandName: 'copy'
});

// 批量注册
shortcutSystem.registerBatch([
  {
    id: 'cut',
    description: '剪切',
    keys: 'x',
    modifiers: { ctrlOrCmd: true },
    commandName: 'cut'
  },
  {
    id: 'paste',
    description: '粘贴',
    keys: 'v',
    modifiers: { ctrlOrCmd: true },
    commandName: 'paste'
  }
]);
```

### 2. 使用快捷键方案

```typescript
import { defaultShortcutSchemes } from '@lavel/shortcut-system';

// 使用内置方案
const basicEditScheme = defaultShortcutSchemes.basicEdit();
shortcutSystem.registerScheme(basicEditScheme);

// 创建自定义方案
const customScheme = {
  name: 'myScheme',
  description: '我的快捷键方案',
  shortcuts: [
    // ... 快捷键列表
  ]
};
shortcutSystem.registerScheme(customScheme);
```

### 3. 使用助手函数

```typescript
import { shortcutHelpers } from '@lavel/shortcut-system';

// 从字符串创建快捷键
const shortcut = shortcutHelpers.createShortcut(
  'save-as',
  'ctrl+shift+s',
  'saveAs',
  {
    description: '另存为',
    category: 'file'
  }
);

// 格式化快捷键显示
const formatted = shortcutHelpers.formatShortcut(shortcut, 'mac');
// 输出: ⌘⇧S
```

### 4. 条件快捷键

```typescript
shortcutSystem.register({
  id: 'conditional-save',
  description: '条件保存',
  keys: 's',
  modifiers: { ctrlOrCmd: true },
  commandName: 'save',
  when: (context) => {
    // 只在编辑器聚焦时生效
    return context.activeElement?.classList.contains('editor');
  }
});

// 设置上下文
shortcutSystem.getManager().setContext({
  activeElement: document.querySelector('.editor')
});
```

### 5. 事件监听

```typescript
const eventEmitter = shortcutSystem.getManager().getEventEmitter();

// 监听快捷键触发
eventEmitter.on('shortcut.triggered', (event) => {
  console.log('快捷键触发:', event.shortcut?.id);
});

// 监听执行完成
eventEmitter.on('shortcut.executed', (event) => {
  console.log('执行完成:', event.data?.result);
});

// 监听错误
eventEmitter.on('shortcut.error', (event) => {
  console.error('执行错误:', event.error);
});
```

### 6. 冲突检测

```typescript
// 验证快捷键
const result = shortcutSystem.validateShortcut({
  id: 'new-save',
  keys: 's',
  modifiers: { ctrlOrCmd: true },
  commandName: 'save'
});

if (!result.valid) {
  console.error('验证错误:', result.errors);
}

if (result.conflicts.length > 0) {
  console.warn('快捷键冲突:', result.conflicts);
}
```

### 7. 导入/导出配置

```typescript
// 导出当前配置
const exportedScheme = shortcutSystem.exportShortcuts();
localStorage.setItem('shortcuts', JSON.stringify(exportedScheme));

// 导入配置
const savedScheme = JSON.parse(localStorage.getItem('shortcuts'));
shortcutSystem.importShortcuts(savedScheme, true); // true = 替换现有配置
```

## 内置快捷键

### 撤销/重做
- `Ctrl/Cmd + Z` - 撤销
- `Ctrl/Cmd + Shift + Z` - 重做

### 文本编辑
- `Ctrl/Cmd + C` - 复制
- `Ctrl/Cmd + X` - 剪切
- `Ctrl/Cmd + V` - 粘贴
- `Ctrl/Cmd + A` - 全选

### 文件操作
- `Ctrl/Cmd + S` - 保存
- `Ctrl/Cmd + Shift + S` - 另存为
- `Ctrl/Cmd + O` - 打开
- `Ctrl/Cmd + N` - 新建

## API 参考

### ShortcutSystem

#### 方法

- `initialize()` - 初始化快捷键系统
- `destroy()` - 销毁快捷键系统
- `register(shortcut)` - 注册单个快捷键
- `registerBatch(shortcuts)` - 批量注册快捷键
- `registerScheme(scheme)` - 注册快捷键方案
- `unregister(shortcutId)` - 注销快捷键
- `enable(shortcutId)` - 启用快捷键
- `disable(shortcutId)` - 禁用快捷键
- `validateShortcut(shortcut)` - 验证快捷键
- `getAllShortcuts()` - 获取所有快捷键
- `getShortcutsByCategory(category)` - 按分类获取
- `getShortcutsByCommand(command)` - 按命令获取
- `exportShortcuts()` - 导出配置
- `importShortcuts(scheme, replace?)` - 导入配置

### ShortcutManager

#### 方法

- `handleKeyEvent(event)` - 处理键盘事件
- `setContext(context)` - 设置上下文
- `getContext()` - 获取当前上下文
- `getRegistry()` - 获取注册表
- `getEventEmitter()` - 获取事件发射器

### ShortcutRegistry

#### 方法

- `getByKeys(keys, modifiers?)` - 通过按键获取
- `getById(id)` - 通过ID获取
- `has(id)` - 检查是否存在
- `isKeysTaken(keys, modifiers?)` - 检查按键占用
- `clear()` - 清空所有快捷键
- `getStats()` - 获取统计信息

## 高级特性

### 自定义平台检测

```typescript
const shortcutSystem = createShortcutSystem(commandSystem, {
  platform: 'mac' // 手动指定平台
});
```

### 自定义按键格式化

```typescript
const shortcutSystem = createShortcutSystem(commandSystem, {
  formatKey: (key) => {
    // 自定义按键格式化逻辑
    return key.toUpperCase();
  }
});
```

### 忽略特定元素

```typescript
const shortcutSystem = createShortcutSystem(commandSystem, {
  ignoreSelectors: [
    'input',
    'textarea',
    'select',
    '[contenteditable="true"]',
    '.no-shortcuts' // 自定义选择器
  ]
});
```

### 错误处理

```typescript
const shortcutSystem = createShortcutSystem(commandSystem, {
  onError: (error, shortcut) => {
    console.error(`快捷键 ${shortcut.id} 执行失败:`, error);
    // 自定义错误处理
  }
});
```

## 与撤销系统集成

```typescript
import { createUndoSystem } from '@lavel/undo-system';

const undoSystem = createUndoSystem(commandSystem);
const shortcutSystem = createShortcutSystem(
  commandSystem, 
  {}, 
  undoSystem // 传入撤销系统
);

// 自动注册撤销/重做快捷键
shortcutSystem.initialize();
```

## 最佳实践

1. **使用有意义的ID** - 快捷键ID应该描述其功能
2. **设置合适的分类** - 便于管理和查找
3. **避免常见冲突** - 不要覆盖浏览器默认快捷键
4. **提供条件执行** - 根据上下文启用/禁用快捷键
5. **处理错误** - 始终提供错误处理机制
6. **国际化支持** - 考虑不同键盘布局
7. **文档化** - 为用户提供快捷键列表

## 故障排除

### 快捷键不生效

1. 检查命令是否已注册
2. 检查快捷键是否被禁用
3. 检查执行条件是否满足
4. 检查是否有冲突

### 浏览器默认行为

使用 `preventDefault: true` 阻止默认行为：

```typescript
{
  preventDefault: true,
  stopPropagation: true
}
```

### 调试模式

启用调试模式查看详细日志：

```typescript
const shortcutSystem = createShortcutSystem(commandSystem, {
  debug: true
});
```

## 许可证

ISC 