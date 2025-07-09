/**
 * 命令集合索引
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
 */
export const allCommands: ICommand[] = [
  ...basicCommands,
  ...userCommands,
  ...systemCommands
];

/**
 * 按分类组织的命令
 */
export const commandsByCategory = {
  math: basicCommands.filter(cmd => cmd.category === 'math'),
  text: basicCommands.filter(cmd => cmd.category === 'text'),
  utility: basicCommands.filter(cmd => cmd.category === 'utility'),
  user: userCommands,
  system: systemCommands
};

/**
 * 便捷的注册方法
 */
export class CommandLoader {
  /**
   * 注册所有基础命令
   */
  static registerBasicCommands(commandSystem: any): void {
    basicCommands.forEach(command => {
      commandSystem.register(command);
    });
  }

  /**
   * 注册所有用户管理命令
   */
  static registerUserCommands(commandSystem: any): void {
    userCommands.forEach(command => {
      commandSystem.register(command);
    });
  }

  /**
   * 注册所有系统命令
   */
  static registerSystemCommands(commandSystem: any): void {
    systemCommands.forEach(command => {
      commandSystem.register(command);
    });
  }

  /**
   * 注册所有命令
   */
  static registerAllCommands(commandSystem: any): void {
    allCommands.forEach(command => {
      commandSystem.register(command);
    });
  }

  /**
   * 按分类注册命令
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
   */
  static registerCommands(commandSystem: any, commands: ICommand[]): void {
    commands.forEach(command => {
      commandSystem.register(command);
    });
  }
}

/**
 * 获取命令统计信息
 */
export const getCommandStats = () => {
  return {
    total: allCommands.length,
    byCategory: {
      math: commandsByCategory.math.length,
      text: commandsByCategory.text.length,
      utility: commandsByCategory.utility.length,
      user: commandsByCategory.user.length,
      system: commandsByCategory.system.length
    },
    withAuth: allCommands.filter(cmd => cmd.requireAuth).length,
    withPermissions: allCommands.filter(cmd => cmd.permissions && cmd.permissions.length > 0).length,
    withAliases: allCommands.filter(cmd => cmd.aliases && cmd.aliases.length > 0).length,
    withValidation: allCommands.filter(cmd => 
      cmd.parameters && cmd.parameters.some(p => p.validation)
    ).length
  };
};

/**
 * 搜索命令
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