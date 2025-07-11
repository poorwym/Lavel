/**
 * Todos 命令定义
 */

import type { ICommand, ICommandContext } from '../../../../command-system';
import { todosApi } from './api';

export const createTodoCommand: ICommand = {
  name: 'todos:create',
  description: '创建新的任务',
  category: 'todos',
  parameters: [
    {
      name: 'title',
      description: '任务标题',
      type: 'string',
      required: true
    },
    {
      name: 'description',
      description: '任务描述',
      type: 'string',
      required: false
    },
    {
      name: 'due_date',
      description: '截止日期',
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
      name: 'auto_expand',
      description: '是否自动展开子任务',
      type: 'boolean',
      required: false,
      defaultValue: true
    }
  ],
  execute: async (context: ICommandContext) => {
    const { title, description, due_date, tags, auto_expand } = context.args;
    
    const result = await todosApi.createTodo({
      title,
      description,
      due_date,
      tags,
      auto_expand
    });

    if (result.success) {
      return {
        success: true,
        data: result.data,
        metadata: { operation: 'create', resource: 'todo' }
      };
    } else {
      return {
        success: false,
        error: result.error || '创建任务失败'
      };
    }
  }
};

export const getTodoCommand: ICommand = {
  name: 'todos:get',
  description: '获取指定任务',
  category: 'todos',
  parameters: [
    {
      name: 'id',
      description: '任务ID',
      type: 'string',
      required: true
    }
  ],
  execute: async (context: ICommandContext) => {
    const { id } = context.args;
    
    const result = await todosApi.getTodo(id);

    if (result.success) {
      return {
        success: true,
        data: result.data,
        metadata: { operation: 'get', resource: 'todo' }
      };
    } else {
      return {
        success: false,
        error: result.error || '获取任务失败'
      };
    }
  }
};

export const updateTodoCommand: ICommand = {
  name: 'todos:update',
  description: '更新任务元数据',
  category: 'todos',
  parameters: [
    {
      name: 'id',
      description: '任务ID',
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
      name: 'due_date',
      description: '新截止日期',
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
    const { id, title, description, due_date, tags } = context.args;
    
    const result = await todosApi.updateTodoMetadata(id, {
      title,
      description,
      due_date,
      tags
    });

    if (result.success) {
      return {
        success: true,
        data: result.data,
        metadata: { operation: 'update', resource: 'todo' }
      };
    } else {
      return {
        success: false,
        error: result.error || '更新任务失败'
      };
    }
  }
};

export const updateTodoStatusCommand: ICommand = {
  name: 'todos:status',
  description: '更新任务状态',
  category: 'todos',
  parameters: [
    {
      name: 'id',
      description: '任务ID',
      type: 'string',
      required: true
    },
    {
      name: 'status',
      description: '新状态',
      type: 'string',
      required: true,
      validation: {
        enum: ['pending', 'in_progress', 'done', 'archived']
      }
    },
    {
      name: 'completion_note',
      description: '完成说明',
      type: 'string',
      required: false
    }
  ],
  execute: async (context: ICommandContext) => {
    const { id, status, completion_note } = context.args;
    
    const result = await todosApi.updateTodoStatus(id, {
      status,
      completion_note
    });

    if (result.success) {
      return {
        success: true,
        data: result.data,
        metadata: { operation: 'status', resource: 'todo' }
      };
    } else {
      return {
        success: false,
        error: result.error || '更新任务状态失败'
      };
    }
  }
};

export const deleteTodoCommand: ICommand = {
  name: 'todos:delete',
  description: '删除任务',
  category: 'todos',
  parameters: [
    {
      name: 'id',
      description: '要删除的任务ID',
      type: 'string',
      required: true
    }
  ],
  execute: async (context: ICommandContext) => {
    const { id } = context.args;
    
    const result = await todosApi.deleteTodo(id);

    if (result.success) {
      return {
        success: true,
        data: result.data,
        metadata: { operation: 'delete', resource: 'todo' }
      };
    } else {
      return {
        success: false,
        error: result.error || '删除任务失败'
      };
    }
  }
};

export const listTodosCommand: ICommand = {
  name: 'todos:list',
  description: '获取任务列表',
  category: 'todos',
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
      name: 'status',
      description: '状态过滤',
      type: 'string',
      required: false,
      validation: {
        enum: ['pending', 'in_progress', 'done', 'archived']
      }
    },
    {
      name: 'tags',
      description: '标签过滤',
      type: 'string',
      required: false
    }
  ],
  execute: async (context: ICommandContext) => {
    const { page, limit, status, tags } = context.args;
    
    const result = await todosApi.listTodos({
      page,
      limit,
      status,
      tags
    });

    if (result.success) {
      return {
        success: true,
        data: result.data,
        metadata: { operation: 'list', resource: 'todo' }
      };
    } else {
      return {
        success: false,
        error: result.error || '获取任务列表失败'
      };
    }
  }
};

export const addSubtaskCommand: ICommand = {
  name: 'todos:add-subtask',
  description: '添加子任务',
  category: 'todos',
  parameters: [
    {
      name: 'todo_id',
      description: '父任务ID',
      type: 'string',
      required: true
    },
    {
      name: 'content',
      description: '子任务内容',
      type: 'string',
      required: true
    },
    {
      name: 'dependencies',
      description: '依赖的子任务ID列表',
      type: 'array',
      required: false
    }
  ],
  execute: async (context: ICommandContext) => {
    const { todo_id, content, dependencies } = context.args;
    
    const result = await todosApi.addSubtask(todo_id, {
      content,
      dependencies
    });

    if (result.success) {
      return {
        success: true,
        data: result.data,
        metadata: { operation: 'add-subtask', resource: 'todo' }
      };
    } else {
      return {
        success: false,
        error: result.error || '添加子任务失败'
      };
    }
  }
};

export const todosCommands = [
  createTodoCommand,
  getTodoCommand,
  updateTodoCommand,
  updateTodoStatusCommand,
  deleteTodoCommand,
  listTodosCommand,
  addSubtaskCommand
]; 