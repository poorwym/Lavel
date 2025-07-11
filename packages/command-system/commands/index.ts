/**
 * 命令集合索引
 * 
 * 统一导出所有命令集合、单个命令和管理工具。
 * 提供便捷的命令注册、搜索和统计功能。
 * 
 * @author Lavel Team
 * @since 1.0.0
 * 
 * @example
 * ```typescript
 * import { 
 *   CommandLoader, 
 *   allCommands, 
 *   searchCommands,
 *   getCommandStats
 * } from './commands';
 * 
 * // 批量注册所有命令
 * CommandLoader.registerAllCommands(commandSystem);
 * 
 * // 搜索命令
 * const mathCommands = searchCommands('math');
 * 
 * // 获取统计信息
 * const stats = getCommandStats();
 * ```
 */

// 导入所有命令集合
export { basicCommands } from './basic';
export { userCommands } from './user';
export { systemCommands } from './system';

// 导入具体命令
export {
  addCommand,
  reverseStringCommand,
  randomCommand,
  uuidCommand,
  timestampCommand
} from './basic';

export {
  createUserCommand,
  getUserCommand,
  listUsersCommand,
  updateUserCommand,
  deleteUserCommand,
  userLoginCommand
} from './user';

export {
  helpCommand,
  statusCommand,
  clearCommand,
  exitCommand,
  versionCommand,
  benchmarkCommand
} from './system';

import { basicCommands } from './basic';
import { userCommands } from './user';
import { systemCommands } from './system';
import { ICommand } from '../types';

/**
 * 所有可用命令的集合
 * 
 * 包含所有预定义的命令，按分类整理。
 * 
 * @public
 * @since 1.0.0
 * 
 * @example
 * ```typescript
 * console.log(`总共有 ${allCommands.length} 个预定义命令`);
 * 
 * // 注册所有命令
 * allCommands.forEach(command => {
 *   commandSystem.register(command);
 * });
 * ```
 */
export const allCommands: ICommand[] = [
  ...basicCommands,
  ...userCommands,
  ...systemCommands
];

/**
 * 按分类组织的命令
 * 
 * 将命令按功能分类，便于按需加载和管理。
 * 
 * @public
 * @since 1.0.0
 * 
 * @example
 * ```typescript
 * // 只注册数学相关命令
 * commandsByCategory.math.forEach(command => {
 *   commandSystem.register(command);
 * });
 * 
 * // 获取用户管理命令
 * const userCommands = commandsByCategory.user;
 * ```
 */
export const commandsByCategory = {
  /** 数学计算相关命令 */
  math: basicCommands.filter(cmd => cmd.category === 'math'),
  /** 文本处理相关命令 */
  text: basicCommands.filter(cmd => cmd.category === 'text'),
  /** 工具类命令 */
  utility: basicCommands.filter(cmd => cmd.category === 'utility'),
  /** 用户管理相关命令 */
  user: userCommands,
  /** 系统管理相关命令 */
  system: systemCommands
};

/**
 * 命令加载器类
 * 
 * 提供批量注册命令的便捷方法，支持按分类、按需求灵活加载命令。
 * 
 * @public
 * @since 1.0.0
 * 
 * @example
 * ```typescript
 * // 注册所有命令
 * CommandLoader.registerAllCommands(commandSystem);
 * 
 * // 只注册基础命令
 * CommandLoader.registerBasicCommands(commandSystem);
 * 
 * // 按分类注册
 * CommandLoader.registerCommandsByCategory(commandSystem, ['math', 'text']);
 * ```
 */
export class CommandLoader {
  /**
   * 注册所有基础命令
   * 
   * 批量注册数学、文本和工具类命令。
   * 
   * @param commandSystem - 要注册到的命令系统实例
   * 
   * @example
   * ```typescript
   * CommandLoader.registerBasicCommands(commandSystem);
   * console.log('基础命令已注册');
   * ```
   */
  static registerBasicCommands(commandSystem: any): void {
    basicCommands.forEach(command => {
      commandSystem.register(command);
    });
  }

  /**
   * 注册所有用户管理命令
   * 
   * 批量注册用户创建、查询、更新等相关命令。
   * 
   * @param commandSystem - 要注册到的命令系统实例
   * 
   * @example
   * ```typescript
   * CommandLoader.registerUserCommands(commandSystem);
   * console.log('用户管理命令已注册');
   * ```
   */
  static registerUserCommands(commandSystem: any): void {
    userCommands.forEach(command => {
      commandSystem.register(command);
    });
  }

  /**
   * 注册所有系统命令
   * 
   * 批量注册系统管理、帮助和状态查询等命令。
   * 
   * @param commandSystem - 要注册到的命令系统实例
   * 
   * @example
   * ```typescript
   * CommandLoader.registerSystemCommands(commandSystem);
   * console.log('系统命令已注册');
   * ```
   */
  static registerSystemCommands(commandSystem: any): void {
    systemCommands.forEach(command => {
      commandSystem.register(command);
    });
  }

  /**
   * 注册所有命令
   * 
   * 一次性注册所有预定义的命令到指定的命令系统中。
   * 
   * @param commandSystem - 要注册到的命令系统实例
   * 
   * @example
   * ```typescript
   * CommandLoader.registerAllCommands(commandSystem);
   * console.log(`已注册 ${allCommands.length} 个命令`);
   * ```
   */
  static registerAllCommands(commandSystem: any): void {
    allCommands.forEach(command => {
      commandSystem.register(command);
    });
  }

  /**
   * 按分类注册命令
   * 
   * 根据提供的分类列表，有选择地注册相应分类的命令。
   * 
   * @param commandSystem - 要注册到的命令系统实例
   * @param categories - 要注册的分类列表
   * 
   * @example
   * ```typescript
   * // 只注册数学和文本处理命令
   * CommandLoader.registerCommandsByCategory(commandSystem, ['math', 'text']);
   * 
   * // 只注册用户管理相关命令
   * CommandLoader.registerCommandsByCategory(commandSystem, ['user']);
   * ```
   */
  static registerCommandsByCategory(commandSystem: any, categories: string[]): void {
    categories.forEach(category => {
      const commands = commandsByCategory[category as keyof typeof commandsByCategory];
      if (commands) {
        commands.forEach(command => {
          commandSystem.register(command);
        });
      }
    });
  }

  /**
   * 注册特定命令列表
   * 
   * 注册用户指定的命令列表，提供最大的灵活性。
   * 
   * @param commandSystem - 要注册到的命令系统实例
   * @param commands - 要注册的命令数组
   * 
   * @example
   * ```typescript
   * // 只注册特定的几个命令
   * CommandLoader.registerCommands(commandSystem, [
   *   addCommand,
   *   helpCommand,
   *   statusCommand
   * ]);
   * ```
   */
  static registerCommands(commandSystem: any, commands: ICommand[]): void {
    commands.forEach(command => {
      commandSystem.register(command);
    });
  }
}

/**
 * 获取命令统计信息
 * 
 * 返回所有预定义命令的详细统计信息，包括总数、分类分布、
 * 权限要求等各种统计数据。
 * 
 * @returns 包含各种统计信息的对象
 * 
 * @example
 * ```typescript
 * const stats = getCommandStats();
 * 
 * console.log(`总命令数: ${stats.total}`);
 * console.log(`数学命令: ${stats.byCategory.math} 个`);
 * console.log(`需要权限的命令: ${stats.withAuth} 个`);
 * console.log(`有别名的命令: ${stats.withAliases} 个`);
 * ```
 */
export const getCommandStats = () => {
  return {
    /** 命令总数 */
    total: allCommands.length,
    /** 按分类统计的命令数量 */
    byCategory: {
      math: commandsByCategory.math.length,
      text: commandsByCategory.text.length,
      utility: commandsByCategory.utility.length,
      user: commandsByCategory.user.length,
      system: commandsByCategory.system.length
    },
    /** 需要权限验证的命令数量 */
    withAuth: allCommands.filter(cmd => cmd.requireAuth).length,
    /** 有权限要求的命令数量 */
    withPermissions: allCommands.filter(cmd => cmd.permissions && cmd.permissions.length > 0).length,
    /** 有别名的命令数量 */
    withAliases: allCommands.filter(cmd => cmd.aliases && cmd.aliases.length > 0).length,
    /** 有参数验证的命令数量 */
    withValidation: allCommands.filter(cmd => 
      cmd.parameters && cmd.parameters.some(p => p.validation)
    ).length
  };
};

/**
 * 搜索命令
 * 
 * 根据查询字符串在所有预定义命令中进行搜索，
 * 支持按命令名、描述、别名和分类进行模糊匹配。
 * 
 * @param query - 搜索关键词
 * @returns 匹配的命令列表
 * 
 * @example
 * ```typescript
 * // 搜索数学相关命令
 * const mathCommands = searchCommands('math');
 * 
 * // 搜索用户相关命令
 * const userCommands = searchCommands('user');
 * 
 * // 搜索包含"add"的命令
 * const addCommands = searchCommands('add');
 * 
 * console.log(`找到 ${mathCommands.length} 个相关命令`);
 * ```
 */
export const searchCommands = (query: string): ICommand[] => {
  const lowercaseQuery = query.toLowerCase();
  
  return allCommands.filter(command => {
    // 搜索命令名
    if (command.name.toLowerCase().includes(lowercaseQuery)) {
      return true;
    }
    
    // 搜索描述
    if (command.description.toLowerCase().includes(lowercaseQuery)) {
      return true;
    }
    
    // 搜索别名
    if (command.aliases) {
      const aliasMatch = command.aliases.some(alias => 
        alias.toLowerCase().includes(lowercaseQuery)
      );
      if (aliasMatch) return true;
    }
    
    // 搜索分类
    if (command.category && command.category.toLowerCase().includes(lowercaseQuery)) {
      return true;
    }
    
    return false;
  });
};

/**
 * 获取命令的简要信息
 * 
 * 根据命令名或别名获取命令的摘要信息，用于快速预览。
 * 
 * @param commandName - 命令名称或别名
 * @returns 包含命令简要信息的对象，如果未找到则返回found: false
 * 
 * @example
 * ```typescript
 * const summary = getCommandSummary('add');
 * if (summary.found) {
 *   console.log(`命令: ${summary.command.name}`);
 *   console.log(`描述: ${summary.command.description}`);
 *   console.log(`分类: ${summary.command.category}`);
 *   console.log(`参数数量: ${summary.command.parameterCount}`);
 * } else {
 *   console.log('命令未找到');
 * }
 * 
 * // 通过别名查询
 * const aliasSummary = getCommandSummary('+'); // 查找add命令的别名
 * ```
 */
export const getCommandSummary = (commandName: string): {
  found: boolean;
  command?: {
    name: string;
    description: string;
    category?: string;
    aliases?: string[];
    parameterCount: number;
    requireAuth: boolean;
  }
} => {
  const command = allCommands.find(cmd => 
    cmd.name === commandName || 
    (cmd.aliases && cmd.aliases.includes(commandName))
  );
  
  if (!command) {
    return { found: false };
  }
  
  return {
    found: true,
    command: {
      name: command.name,
      description: command.description,
      category: command.category,
      aliases: command.aliases,
      parameterCount: command.parameters ? command.parameters.length : 0,
      requireAuth: command.requireAuth || false
    }
  };
}; 