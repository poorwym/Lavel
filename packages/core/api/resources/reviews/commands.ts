/**
 * Reviews 命令定义
 */

import type { ICommand, ICommandContext } from '../../../../command-system';
import { reviewsApi } from './api';

export const createReviewCommand: ICommand = {
  name: 'reviews:create',
  description: '创建新的复盘记录',
  category: 'reviews',
  parameters: [
    {
      name: 'title',
      description: '复盘标题',
      type: 'string',
      required: true
    },
    {
      name: 'summary',
      description: '复盘摘要',
      type: 'string',
      required: false
    },
    {
      name: 'tags',
      description: '标签列表',
      type: 'array',
      required: false
    },
    {
      name: 'auto_collect',
      description: '是否自动收集相关内容',
      type: 'boolean',
      required: false,
      defaultValue: true
    }
  ],
  execute: async (context: ICommandContext) => {
    const { title, summary, tags, auto_collect } = context.args;
    
    const result = await reviewsApi.createReview({
      title,
      summary,
      tags,
      auto_collect
    });

    if (result.success) {
      return {
        success: true,
        data: result.data,
        metadata: { operation: 'create', resource: 'review' }
      };
    } else {
      return {
        success: false,
        error: result.error || '创建复盘记录失败'
      };
    }
  }
};

export const getReviewCommand: ICommand = {
  name: 'reviews:get',
  description: '获取指定复盘记录',
  category: 'reviews',
  parameters: [
    {
      name: 'id',
      description: '复盘ID',
      type: 'string',
      required: true
    }
  ],
  execute: async (context: ICommandContext) => {
    const { id } = context.args;
    
    const result = await reviewsApi.getReview(id);

    if (result.success) {
      return {
        success: true,
        data: result.data,
        metadata: { operation: 'get', resource: 'review' }
      };
    } else {
      return {
        success: false,
        error: result.error || '获取复盘记录失败'
      };
    }
  }
};

export const updateReviewCommand: ICommand = {
  name: 'reviews:update',
  description: '更新复盘记录',
  category: 'reviews',
  parameters: [
    {
      name: 'id',
      description: '复盘ID',
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
      name: 'summary',
      description: '新摘要',
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
    const { id, title, summary, tags } = context.args;
    
    const result = await reviewsApi.updateReviewMetadata(id, {
      title,
      summary,
      tags
    });

    if (result.success) {
      return {
        success: true,
        data: result.data,
        metadata: { operation: 'update', resource: 'review' }
      };
    } else {
      return {
        success: false,
        error: result.error || '更新复盘记录失败'
      };
    }
  }
};

export const deleteReviewCommand: ICommand = {
  name: 'reviews:delete',
  description: '删除复盘记录',
  category: 'reviews',
  parameters: [
    {
      name: 'id',
      description: '要删除的复盘ID',
      type: 'string',
      required: true
    }
  ],
  execute: async (context: ICommandContext) => {
    const { id } = context.args;
    
    const result = await reviewsApi.deleteReview(id);

    if (result.success) {
      return {
        success: true,
        data: result.data,
        metadata: { operation: 'delete', resource: 'review' }
      };
    } else {
      return {
        success: false,
        error: result.error || '删除复盘记录失败'
      };
    }
  }
};

export const listReviewsCommand: ICommand = {
  name: 'reviews:list',
  description: '获取复盘记录列表',
  category: 'reviews',
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
    
    const result = await reviewsApi.listReviews({
      page,
      limit,
      tags
    });

    if (result.success) {
      return {
        success: true,
        data: result.data,
        metadata: { operation: 'list', resource: 'review' }
      };
    } else {
      return {
        success: false,
        error: result.error || '获取复盘记录列表失败'
      };
    }
  }
};

export const reviewsCommands = [
  createReviewCommand,
  getReviewCommand,
  updateReviewCommand,
  deleteReviewCommand,
  listReviewsCommand
]; 