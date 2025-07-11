/**
 * Thoughts 命令定义
 */

import type { ICommand, ICommandContext } from '../../../../command-system';
import { thoughtsApi } from './api';

export const createThoughtCommand: ICommand = {
  name: 'thoughts:create',
  description: '创建新的思考笔记',
  category: 'thoughts',
  parameters: [
    {
      name: 'summary',
      description: '思考概述',
      type: 'string',
      required: false
    },
    {
      name: 'tags',
      description: '标签列表',
      type: 'array',
      required: false
    }
  ],
  execute: async (context: ICommandContext) => {
    const { summary, tags } = context.args;
    
    const result = await thoughtsApi.createThought({
      summary,
      tags
    });

    if (result.success) {
      return {
        success: true,
        data: result.data,
        metadata: { operation: 'create', resource: 'thought' }
      };
    } else {
      return {
        success: false,
        error: result.error || '创建思考笔记失败'
      };
    }
  }
};

export const getThoughtCommand: ICommand = {
  name: 'thoughts:get',
  description: '获取指定思考笔记',
  category: 'thoughts',
  parameters: [
    {
      name: 'id',
      description: '思考ID',
      type: 'string',
      required: true
    }
  ],
  execute: async (context: ICommandContext) => {
    const { id } = context.args;
    
    const result = await thoughtsApi.getThought(id);

    if (result.success) {
      return {
        success: true,
        data: result.data,
        metadata: { operation: 'get', resource: 'thought' }
      };
    } else {
      return {
        success: false,
        error: result.error || '获取思考笔记失败'
      };
    }
  }
};

export const updateThoughtCommand: ICommand = {
  name: 'thoughts:update',
  description: '更新思考笔记',
  category: 'thoughts',
  parameters: [
    {
      name: 'id',
      description: '思考ID',
      type: 'string',
      required: true
    },
    {
      name: 'summary',
      description: '新概述',
      type: 'string',
      required: false
    },
    {
      name: 'tags',
      description: '新标签列表',
      type: 'array',
      required: false
    }
  ],
  execute: async (context: ICommandContext) => {
    const { id, summary, tags } = context.args;
    
    const result = await thoughtsApi.updateThought(id, {
      summary,
      tags
    });

    if (result.success) {
      return {
        success: true,
        data: result.data,
        metadata: { operation: 'update', resource: 'thought' }
      };
    } else {
      return {
        success: false,
        error: result.error || '更新思考笔记失败'
      };
    }
  }
};

export const deleteThoughtCommand: ICommand = {
  name: 'thoughts:delete',
  description: '删除思考笔记',
  category: 'thoughts',
  parameters: [
    {
      name: 'id',
      description: '要删除的思考ID',
      type: 'string',
      required: true
    }
  ],
  execute: async (context: ICommandContext) => {
    const { id } = context.args;
    
    const result = await thoughtsApi.deleteThought(id);

    if (result.success) {
      return {
        success: true,
        data: result.data,
        metadata: { operation: 'delete', resource: 'thought' }
      };
    } else {
      return {
        success: false,
        error: result.error || '删除思考笔记失败'
      };
    }
  }
};

export const listThoughtsCommand: ICommand = {
  name: 'thoughts:list',
  description: '获取思考笔记列表',
  category: 'thoughts',
  parameters: [
    {
      name: 'page',
      description: '页码',
      type: 'number',
      required: false,
      defaultValue: 1
    },
    {
      name: 'limit',
      description: '每页数量',
      type: 'number',
      required: false,
      defaultValue: 20
    },
    {
      name: 'tags',
      description: '标签过滤',
      type: 'string',
      required: false
    }
  ],
  execute: async (context: ICommandContext) => {
    const { page, limit, tags } = context.args;
    
    const result = await thoughtsApi.listThoughts({
      page,
      limit,
      tags
    });

    if (result.success) {
      return {
        success: true,
        data: result.data,
        metadata: { operation: 'list', resource: 'thought' }
      };
    } else {
      return {
        success: false,
        error: result.error || '获取思考笔记列表失败'
      };
    }
  }
};

export const upgradeThoughtCommand: ICommand = {
  name: 'thoughts:upgrade',
  description: '将思考笔记升级为知识文档',
  category: 'thoughts',
  parameters: [
    {
      name: 'id',
      description: '思考ID',
      type: 'string',
      required: true
    },
    {
      name: 'title',
      description: '知识文档标题',
      type: 'string',
      required: false
    },
    {
      name: 'description',
      description: '知识文档描述',
      type: 'string',
      required: false
    }
  ],
  execute: async (context: ICommandContext) => {
    const { id, title, description } = context.args;
    
    const result = await thoughtsApi.upgradeThoughtToKnowledge(id, {
      title,
      description
    });

    if (result.success) {
      return {
        success: true,
        data: result.data,
        metadata: { operation: 'upgrade', resource: 'thought' }
      };
    } else {
      return {
        success: false,
        error: result.error || '升级思考笔记失败'
      };
    }
  }
};

export const thoughtsCommands = [
  createThoughtCommand,
  getThoughtCommand,
  updateThoughtCommand,
  deleteThoughtCommand,
  listThoughtsCommand,
  upgradeThoughtCommand
]; 