/**
 * Knowledges 命令定义
 */

import type { ICommand, ICommandContext } from '../../../../command-system';
import { knowledgesApi } from './api';

export const createKnowledgeCommand: ICommand = {
  name: 'knowledges:create',
  description: '创建新的知识文档',
  category: 'knowledges',
  parameters: [
    {
      name: 'title',
      description: '知识标题',
      type: 'string',
      required: true
    },
    {
      name: 'description',
      description: '知识描述',
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
    const { title, description, tags } = context.args;
    
    const result = await knowledgesApi.createKnowledge({
      title,
      description,
      tags
    });

    if (result.success) {
      return {
        success: true,
        data: result.data,
        metadata: { operation: 'create', resource: 'knowledge' }
      };
    } else {
      return {
        success: false,
        error: result.error || '创建知识文档失败'
      };
    }
  }
};

export const getKnowledgeCommand: ICommand = {
  name: 'knowledges:get',
  description: '获取指定知识文档',
  category: 'knowledges',
  parameters: [
    {
      name: 'id',
      description: '知识ID',
      type: 'string',
      required: true
    }
  ],
  execute: async (context: ICommandContext) => {
    const { id } = context.args;
    
    const result = await knowledgesApi.getKnowledge(id);

    if (result.success) {
      return {
        success: true,
        data: result.data,
        metadata: { operation: 'get', resource: 'knowledge' }
      };
    } else {
      return {
        success: false,
        error: result.error || '获取知识文档失败'
      };
    }
  }
};

export const updateKnowledgeCommand: ICommand = {
  name: 'knowledges:update',
  description: '更新知识文档元数据',
  category: 'knowledges',
  parameters: [
    {
      name: 'id',
      description: '知识ID',
      type: 'string',
      required: true
    },
    {
      name: 'title',
      description: '新标题',
      type: 'string',
      required: false
    },
    {
      name: 'description',
      description: '新描述',
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
    const { id, title, description, tags } = context.args;
    
    const result = await knowledgesApi.updateKnowledgeMetadata(id, {
      title,
      description,
      tags
    });

    if (result.success) {
      return {
        success: true,
        data: result.data,
        metadata: { operation: 'update', resource: 'knowledge' }
      };
    } else {
      return {
        success: false,
        error: result.error || '更新知识文档失败'
      };
    }
  }
};

export const deleteKnowledgeCommand: ICommand = {
  name: 'knowledges:delete',
  description: '删除知识文档',
  category: 'knowledges',
  parameters: [
    {
      name: 'id',
      description: '要删除的知识ID',
      type: 'string',
      required: true
    }
  ],
  execute: async (context: ICommandContext) => {
    const { id } = context.args;
    
    const result = await knowledgesApi.deleteKnowledge(id);

    if (result.success) {
      return {
        success: true,
        data: result.data,
        metadata: { operation: 'delete', resource: 'knowledge' }
      };
    } else {
      return {
        success: false,
        error: result.error || '删除知识文档失败'
      };
    }
  }
};

export const listKnowledgesCommand: ICommand = {
  name: 'knowledges:list',
  description: '获取知识文档列表',
  category: 'knowledges',
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
    
    const result = await knowledgesApi.listKnowledges({
      page,
      limit,
      tags
    });

    if (result.success) {
      return {
        success: true,
        data: result.data,
        metadata: { operation: 'list', resource: 'knowledge' }
      };
    } else {
      return {
        success: false,
        error: result.error || '获取知识文档列表失败'
      };
    }
  }
};

export const searchKnowledgesCommand: ICommand = {
  name: 'knowledges:search',
  description: '搜索知识文档',
  category: 'knowledges',
  parameters: [
    {
      name: 'query',
      description: '搜索关键词',
      type: 'string',
      required: true
    }
  ],
  execute: async (context: ICommandContext) => {
    const { query } = context.args;
    
    const result = await knowledgesApi.searchKnowledges(query);

    if (result.success) {
      return {
        success: true,
        data: result.data,
        metadata: { operation: 'search', resource: 'knowledge' }
      };
    } else {
      return {
        success: false,
        error: result.error || '搜索知识文档失败'
      };
    }
  }
};

export const knowledgesCommands = [
  createKnowledgeCommand,
  getKnowledgeCommand,
  updateKnowledgeCommand,
  deleteKnowledgeCommand,
  listKnowledgesCommand,
  searchKnowledgesCommand
]; 