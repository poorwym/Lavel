/**
 * 系统管理命令集合
 */

import { ICommand, ICommandContext, ICommandResult } from '../types';

/**
 * 帮助命令
 */
export const helpCommand: ICommand = {
  name: 'help',
  description: '显示命令帮助信息',
  category: 'system',
  aliases: ['h', '?'],
  parameters: [
    {
      name: 'commandName',
      description: '要查看帮助的命令名称（可选）',
      type: 'string',
      required: false
    }
  ],
  execute: async (context: ICommandContext): Promise<ICommandResult> => {
    const { commandName } = context.args;
    
    // 这里需要访问命令注册表，通过环境变量传入
    const commandSystem = context.env.commandSystem;
    if (!commandSystem) {
      return {
        success: false,
        error: '无法访问命令系统'
      };
    }
    
    if (commandName) {
      // 显示特定命令的详细帮助
      const command = commandSystem.getCommand(commandName);
      if (!command) {
        return {
          success: false,
          error: `命令 '${commandName}' 不存在`
        };
      }
      
      const helpInfo = {
        name: command.name,
        description: command.description,
        category: command.category,
        aliases: command.aliases || [],
        requireAuth: command.requireAuth || false,
        permissions: command.permissions || [],
        parameters: (command.parameters || []).map(param => ({
          name: param.name,
          description: param.description,
          type: param.type,
          required: param.required || false,
          defaultValue: param.defaultValue,
          validation: param.validation
        }))
      };
      
      return {
        success: true,
        data: {
          command: helpInfo,
          usage: `使用方法: ${command.name} ${(command.parameters || [])
            .map(p => p.required ? `<${p.name}>` : `[${p.name}]`)
            .join(' ')}`
        }
      };
    } else {
      // 显示所有命令的概览
      const allCommands = commandSystem.getAllCommands();
      const categories = [...new Set(allCommands.map(cmd => cmd.category).filter(Boolean))];
      
      const commandsByCategory = categories.reduce((acc, category) => {
        acc[category] = commandSystem.getCommandsByCategory(category)
          .map(cmd => ({
            name: cmd.name,
            description: cmd.description,
            aliases: cmd.aliases || []
          }));
        return acc;
      }, {} as Record<string, any[]>);
      
      // 未分类命令
      const uncategorized = allCommands
        .filter(cmd => !cmd.category)
        .map(cmd => ({
          name: cmd.name,
          description: cmd.description,
          aliases: cmd.aliases || []
        }));
      
      if (uncategorized.length > 0) {
        commandsByCategory['其他'] = uncategorized;
      }
      
      return {
        success: true,
        data: {
          totalCommands: allCommands.length,
          categories: categories,
          commands: commandsByCategory,
          usage: '使用 help <命令名> 查看具体命令的详细帮助'
        }
      };
    }
  }
};

/**
 * 系统状态命令
 */
export const statusCommand: ICommand = {
  name: 'status',
  description: '显示系统状态信息',
  category: 'system',
  aliases: ['stat', 'info'],
  execute: async (context: ICommandContext): Promise<ICommandResult> => {
    const commandSystem = context.env.commandSystem;
    if (!commandSystem) {
      return {
        success: false,
        error: '无法访问命令系统'
      };
    }
    
    const stats = commandSystem.getStats();
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    
    return {
      success: true,
      data: {
        system: {
          uptime: {
            seconds: Math.floor(uptime),
            formatted: `${Math.floor(uptime / 3600)}小时 ${Math.floor((uptime % 3600) / 60)}分钟 ${Math.floor(uptime % 60)}秒`
          },
          memory: {
            rss: Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100, // MB
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100,
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100,
            external: Math.round(memoryUsage.external / 1024 / 1024 * 100) / 100
          },
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch
        },
        commands: stats,
        currentUser: context.user ? {
          id: context.user.id,
          permissions: context.user.permissions
        } : null
      }
    };
  }
};

/**
 * 清空命令历史
 */
export const clearCommand: ICommand = {
  name: 'clear',
  description: '清空控制台或重置状态',
  category: 'system',
  aliases: ['cls'],
  parameters: [
    {
      name: 'target',
      description: '清空目标',
      type: 'string',
      required: false,
      defaultValue: 'console',
      validation: {
        enum: ['console', 'history', 'cache']
      }
    }
  ],
  execute: async (context: ICommandContext): Promise<ICommandResult> => {
    const { target } = context.args;
    
    switch (target) {
      case 'console':
        return {
          success: true,
          data: {
            message: '控制台已清空',
            action: 'clear_console'
          }
        };
        
      case 'history':
        return {
          success: true,
          data: {
            message: '命令历史已清空',
            action: 'clear_history'
          }
        };
        
      case 'cache':
        return {
          success: true,
          data: {
            message: '缓存已清空',
            action: 'clear_cache'
          }
        };
        
      default:
        return {
          success: false,
          error: '不支持的清空目标'
        };
    }
  }
};

/**
 * 退出命令
 */
export const exitCommand: ICommand = {
  name: 'exit',
  description: '退出系统',
  category: 'system',
  aliases: ['quit', 'bye'],
  parameters: [
    {
      name: 'code',
      description: '退出代码',
      type: 'number',
      required: false,
      defaultValue: 0
    }
  ],
  execute: async (context: ICommandContext): Promise<ICommandResult> => {
    const { code } = context.args;
    
    return {
      success: true,
      data: {
        message: `系统即将退出 (代码: ${code})`,
        action: 'exit',
        exitCode: code
      }
    };
  }
};

/**
 * 版本信息命令
 */
export const versionCommand: ICommand = {
  name: 'version',
  description: '显示版本信息',
  category: 'system',
  aliases: ['v', '--version'],
  execute: async (context: ICommandContext): Promise<ICommandResult> => {
    return {
      success: true,
      data: {
        commandSystem: {
          name: '@lavel/command-system',
          version: '1.0.0',
          description: '灵活的命令系统框架',
          author: 'alex'
        },
        runtime: {
          node: process.version,
          platform: process.platform,
          arch: process.arch
        },
        features: [
          '命令注册与管理',
          '参数验证',
          '权限控制',
          '中间件支持',
          '事件系统',
          '批量执行',
          '错误处理'
        ]
      }
    };
  }
};

/**
 * 性能测试命令
 */
export const benchmarkCommand: ICommand = {
  name: 'benchmark',
  description: '性能测试工具',
  category: 'system',
  aliases: ['bench', 'perf'],
  parameters: [
    {
      name: 'commandName',
      description: '要测试的命令名称',
      type: 'string',
      required: true
    },
    {
      name: 'iterations',
      description: '执行次数',
      type: 'number',
      required: false,
      defaultValue: 100,
      validation: {
        min: 1,
        max: 10000
      }
    },
    {
      name: 'args',
      description: '命令参数',
      type: 'object',
      required: false,
      defaultValue: {}
    }
  ],
  execute: async (context: ICommandContext): Promise<ICommandResult> => {
    const { commandName, iterations, args } = context.args;
    const commandSystem = context.env.commandSystem;
    
    if (!commandSystem) {
      return {
        success: false,
        error: '无法访问命令系统'
      };
    }
    
    if (!commandSystem.hasCommand(commandName)) {
      return {
        success: false,
        error: `命令 '${commandName}' 不存在`
      };
    }
    
    const results: number[] = [];
    const errors: string[] = [];
    
    const testContext = {
      ...context,
      args: args
    };
    
    for (let i = 0; i < iterations; i++) {
      try {
        const startTime = process.hrtime.bigint();
        const result = await commandSystem.execute(commandName, testContext);
        const endTime = process.hrtime.bigint();
        
        const executionTime = Number(endTime - startTime) / 1_000_000; // 转换为毫秒
        results.push(executionTime);
        
        if (!result.success) {
          errors.push(`第${i + 1}次执行失败: ${result.error}`);
        }
      } catch (error) {
        errors.push(`第${i + 1}次执行异常: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    if (results.length === 0) {
      return {
        success: false,
        error: '所有测试都失败了',
        data: { errors }
      };
    }
    
    // 计算统计信息
    const sortedResults = results.sort((a, b) => a - b);
    const sum = results.reduce((acc, val) => acc + val, 0);
    const avg = sum / results.length;
    const min = sortedResults[0];
    const max = sortedResults[sortedResults.length - 1];
    const median = sortedResults[Math.floor(sortedResults.length / 2)];
    const p95 = sortedResults[Math.floor(sortedResults.length * 0.95)];
    const p99 = sortedResults[Math.floor(sortedResults.length * 0.99)];
    
    return {
      success: true,
      data: {
        command: commandName,
        iterations: iterations,
        successful: results.length,
        failed: errors.length,
        statistics: {
          average: Number(avg.toFixed(3)),
          median: Number(median.toFixed(3)),
          min: Number(min.toFixed(3)),
          max: Number(max.toFixed(3)),
          p95: Number(p95.toFixed(3)),
          p99: Number(p99.toFixed(3))
        },
        errors: errors.slice(0, 10) // 只显示前10个错误
      }
    };
  }
};

// 导出所有系统命令
export const systemCommands: ICommand[] = [
  helpCommand,
  statusCommand,
  clearCommand,
  exitCommand,
  versionCommand,
  benchmarkCommand
]; 