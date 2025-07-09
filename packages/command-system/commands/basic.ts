/**
 * 基础命令集合
 */

import { ICommand, ICommandContext, ICommandResult } from '../types';

/**
 * 加法命令
 */
export const addCommand: ICommand = {
  name: 'add',
  description: '执行两个数字的加法运算',
  category: 'math',
  aliases: ['plus', '+'],
  parameters: [
    {
      name: 'a',
      description: '第一个数字',
      type: 'number',
      required: true
    },
    {
      name: 'b',
      description: '第二个数字',
      type: 'number',
      required: true
    }
  ],
  execute: async (context: ICommandContext): Promise<ICommandResult> => {
    const { a, b } = context.args;
    const result = a + b;
    
    return {
      success: true,
      data: {
        operation: 'addition',
        operands: [a, b],
        result: result
      },
      metadata: {
        formula: `${a} + ${b} = ${result}`
      }
    };
  }
};

/**
 * 字符串反转命令
 */
export const reverseStringCommand: ICommand = {
  name: 'reverse',
  description: '反转输入的字符串',
  category: 'text',
  parameters: [
    {
      name: 'text',
      description: '要反转的文本',
      type: 'string',
      required: true,
      validation: {
        min: 1,
        max: 1000
      }
    }
  ],
  execute: async (context: ICommandContext): Promise<ICommandResult> => {
    const { text } = context.args;
    const reversed = text.split('').reverse().join('');
    
    return {
      success: true,
      data: {
        original: text,
        reversed: reversed,
        length: text.length
      }
    };
  }
};

/**
 * 随机数生成命令
 */
export const randomCommand: ICommand = {
  name: 'random',
  description: '生成指定范围内的随机数',
  category: 'utility',
  aliases: ['rand'],
  parameters: [
    {
      name: 'min',
      description: '最小值',
      type: 'number',
      required: false,
      defaultValue: 0
    },
    {
      name: 'max',
      description: '最大值',
      type: 'number',
      required: false,
      defaultValue: 100
    },
    {
      name: 'count',
      description: '生成随机数的个数',
      type: 'number',
      required: false,
      defaultValue: 1,
      validation: {
        min: 1,
        max: 10
      }
    }
  ],
  validate: async (context: ICommandContext): Promise<boolean> => {
    const { min, max } = context.args;
    if (min >= max) {
      return false;
    }
    return true;
  },
  execute: async (context: ICommandContext): Promise<ICommandResult> => {
    const { min, max, count } = context.args;
    
    if (min >= max) {
      return {
        success: false,
        error: '最小值必须小于最大值'
      };
    }
    
    const numbers: number[] = [];
    for (let i = 0; i < count; i++) {
      const randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
      numbers.push(randomNum);
    }
    
    return {
      success: true,
      data: {
        numbers: numbers,
        range: { min, max },
        count: count
      }
    };
  }
};

/**
 * UUID 生成命令
 */
export const uuidCommand: ICommand = {
  name: 'uuid',
  description: '生成UUID字符串',
  category: 'utility',
  parameters: [
    {
      name: 'version',
      description: 'UUID版本',
      type: 'string',
      required: false,
      defaultValue: 'v4',
      validation: {
        enum: ['v1', 'v4']
      }
    },
    {
      name: 'count',
      description: '生成UUID的个数',
      type: 'number',
      required: false,
      defaultValue: 1,
      validation: {
        min: 1,
        max: 5
      }
    }
  ],
  execute: async (context: ICommandContext): Promise<ICommandResult> => {
    const { version, count } = context.args;
    
    const generateUUID = (): string => {
      if (version === 'v1') {
        // 简化的v1 UUID生成（实际应该包含时间戳和MAC地址）
        const timestamp = Date.now().toString(16);
        const random = Math.random().toString(16).substring(2);
        return `${timestamp}-${random}`.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
      } else {
        // v4 UUID
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      }
    };
    
    const uuids: string[] = [];
    for (let i = 0; i < count; i++) {
      uuids.push(generateUUID());
    }
    
    return {
      success: true,
      data: {
        uuids: uuids,
        version: version,
        count: count
      }
    };
  }
};

/**
 * 时间戳转换命令
 */
export const timestampCommand: ICommand = {
  name: 'timestamp',
  description: '时间戳转换工具',
  category: 'utility',
  aliases: ['ts', 'time'],
  parameters: [
    {
      name: 'action',
      description: '操作类型',
      type: 'string',
      required: true,
      validation: {
        enum: ['now', 'convert', 'format']
      }
    },
    {
      name: 'value',
      description: '时间戳或日期字符串',
      type: 'string',
      required: false
    },
    {
      name: 'format',
      description: '日期格式',
      type: 'string',
      required: false,
      defaultValue: 'YYYY-MM-DD HH:mm:ss'
    }
  ],
  execute: async (context: ICommandContext): Promise<ICommandResult> => {
    const { action, value, format } = context.args;
    
    try {
      switch (action) {
        case 'now':
          const now = Date.now();
          return {
            success: true,
            data: {
              timestamp: now,
              date: new Date(now).toISOString(),
              formatted: new Date(now).toLocaleString('zh-CN')
            }
          };
          
        case 'convert':
          if (!value) {
            return { success: false, error: '转换操作需要提供时间戳或日期值' };
          }
          
          const timestamp = isNaN(Number(value)) ? new Date(value).getTime() : Number(value);
          if (isNaN(timestamp)) {
            return { success: false, error: '无效的时间戳或日期格式' };
          }
          
          return {
            success: true,
            data: {
              timestamp: timestamp,
              date: new Date(timestamp).toISOString(),
              formatted: new Date(timestamp).toLocaleString('zh-CN')
            }
          };
          
        case 'format':
          if (!value) {
            return { success: false, error: '格式化操作需要提供时间戳或日期值' };
          }
          
          const formatTimestamp = isNaN(Number(value)) ? new Date(value).getTime() : Number(value);
          if (isNaN(formatTimestamp)) {
            return { success: false, error: '无效的时间戳或日期格式' };
          }
          
          const date = new Date(formatTimestamp);
          return {
            success: true,
            data: {
              timestamp: formatTimestamp,
              formatted: date.toLocaleString('zh-CN'),
              iso: date.toISOString(),
              custom: format // 简化版本，实际项目中可以使用 moment.js 或 date-fns
            }
          };
          
        default:
          return { success: false, error: '不支持的操作类型' };
      }
    } catch (error) {
      return {
        success: false,
        error: `时间戳处理失败: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
};

// 导出所有基础命令
export const basicCommands: ICommand[] = [
  addCommand,
  reverseStringCommand,
  randomCommand,
  uuidCommand,
  timestampCommand
]; 