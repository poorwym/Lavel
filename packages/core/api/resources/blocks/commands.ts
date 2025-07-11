/**
 * @fileoverview Blocks 命令定义模块
 * 
 * 将 Blocks API 操作封装为标准化的命令，供 Lavel 命令系统使用。
 * 每个命令都遵循统一的接口规范，包含参数定义、执行逻辑和错误处理。
 * 
 * 支持的 Blocks 操作：
 * - blocks:create - 创建新块
 * - blocks:get - 获取指定块
 * - blocks:update - 更新块内容
 * - blocks:delete - 删除块
 * - blocks:list - 获取块列表
 * - blocks:move - 移动块位置
 * - blocks:children - 获取子块
 * - blocks:siblings - 获取兄弟块
 * 
 * @author Lavel Team
 * @since 1.0.0
 */

import type { ICommand, ICommandContext } from '../../../../command-system';
import { blocksApi } from './api';

/**
 * 创建block命令
 */
export const createBlockCommand: ICommand = {
  name: 'blocks:create',
  description: '创建新的block',
  category: 'blocks',
  parameters: [
    {
      name: 'content',
      description: '块内容',
      type: 'string',
      required: true
    },
    {
      name: 'parent_id',
      description: '父块ID',
      type: 'string',
      required: false
    },
    {
      name: 'prev_id',
      description: '前一个兄弟块ID',
      type: 'string',
      required: false
    },
    {
      name: 'next_id',
      description: '下一个兄弟块ID',
      type: 'string',
      required: false
    }
  ],
  execute: async (context: ICommandContext) => {
    const { content, parent_id, prev_id, next_id } = context.args;
    
    const result = await blocksApi.createBlock({
      content,
      parent_id,
      prev_id,
      next_id
    });

    if (result.success) {
      return {
        success: true,
        data: result.data,
        metadata: { operation: 'create', resource: 'block' }
      };
    } else {
      return {
        success: false,
        error: result.error || '创建block失败'
      };
    }
  }
};

/**
 * 获取block命令
 */
export const getBlockCommand: ICommand = {
  name: 'blocks:get',
  description: '获取指定block',
  category: 'blocks',
  parameters: [
    {
      name: 'id',
      description: '块ID',
      type: 'string',
      required: true
    }
  ],
  execute: async (context: ICommandContext) => {
    const { id } = context.args;
    
    const result = await blocksApi.getBlock(id);

    if (result.success) {
      return {
        success: true,
        data: result.data,
        metadata: { operation: 'get', resource: 'block' }
      };
    } else {
      return {
        success: false,
        error: result.error || '获取block失败'
      };
    }
  }
};

/**
 * 更新block命令
 */
export const updateBlockCommand: ICommand = {
  name: 'blocks:update',
  description: '更新block内容',
  category: 'blocks',
  parameters: [
    {
      name: 'id',
      description: '块ID',
      type: 'string',
      required: true
    },
    {
      name: 'content',
      description: '新的块内容',
      type: 'string',
      required: false
    },
    {
      name: 'parent_id',
      description: '新的父块ID',
      type: 'string',
      required: false
    }
  ],
  execute: async (context: ICommandContext) => {
    const { id, content, parent_id, prev_id, next_id } = context.args;
    
    const result = await blocksApi.updateBlock(id, {
      content,
      parent_id,
      prev_id,
      next_id
    });

    if (result.success) {
      return {
        success: true,
        data: result.data,
        metadata: { operation: 'update', resource: 'block' }
      };
    } else {
      return {
        success: false,
        error: result.error || '更新block失败'
      };
    }
  }
};

/**
 * 删除block命令
 */
export const deleteBlockCommand: ICommand = {
  name: 'blocks:delete',
  description: '删除指定block',
  category: 'blocks',
  parameters: [
    {
      name: 'id',
      description: '要删除的块ID',
      type: 'string',
      required: true
    }
  ],
  execute: async (context: ICommandContext) => {
    const { id } = context.args;
    
    const result = await blocksApi.deleteBlock(id);

    if (result.success) {
      return {
        success: true,
        data: result.data,
        metadata: { operation: 'delete', resource: 'block' }
      };
    } else {
      return {
        success: false,
        error: result.error || '删除block失败'
      };
    }
  }
};

/**
 * 获取 blocks 列表命令
 * 
 * 支持分页查询和多种过滤条件，适用于块的批量获取和管理场景。
 * 
 * @example
 * ```typescript
 * // 通过命令系统执行
 * const result = await commandSystem.execute('blocks:list', {
 *   page: 1,
 *   limit: 20,
 *   parent_id: 'root-block-id'
 * });
 * ```
 */
export const listBlocksCommand: ICommand = {
  name: 'blocks:list',
  description: '获取 blocks 列表，支持分页和过滤',
  category: 'blocks',
  parameters: [
    {
      name: 'page',
      description: '页码，从 1 开始',
      type: 'number',
      required: false,
      defaultValue: 1
    },
    {
      name: 'limit',
      description: '每页数量，范围 1-100',
      type: 'number',
      required: false,
      defaultValue: 20
    },
    {
      name: 'parent_id',
      description: '父块 ID 过滤，获取指定父块的子块',
      type: 'string',
      required: false
    },
    {
      name: 'tags',
      description: '标签过滤，多个标签用逗号分隔',
      type: 'string',
      required: false
    }
  ],
  execute: async (context: ICommandContext) => {
    const { page, limit, parent_id, tags } = context.args;
    
    const result = await blocksApi.listBlocks({
      page,
      limit,
      parent_id,
      tags
    });

    if (result.success) {
      return {
        success: true,
        data: result.data,
        metadata: { operation: 'list', resource: 'block' }
      };
    } else {
      return {
        success: false,
        error: result.error || '获取 blocks 列表失败'
      };
    }
  }
};

/**
 * 移动 block 位置命令
 * 
 * 在双向链表结构中移动块的位置，可以改变父子关系和兄弟顺序。
 * 操作会自动维护链表的完整性和一致性。
 * 
 * @example
 * ```typescript
 * // 将块移动到新的父块下
 * await commandSystem.execute('blocks:move', {
 *   id: 'block-123',
 *   parent_id: 'new-parent-id'
 * });
 * 
 * // 调整兄弟块顺序
 * await commandSystem.execute('blocks:move', {
 *   id: 'block-123',
 *   prev_id: 'previous-sibling-id',
 *   next_id: 'next-sibling-id'
 * });
 * ```
 */
export const moveBlockCommand: ICommand = {
  name: 'blocks:move',
  description: '移动 block 在双向链表中的位置',
  category: 'blocks',
  parameters: [
    {
      name: 'id',
      description: '要移动的块 ID',
      type: 'string',
      required: true
    },
    {
      name: 'parent_id',
      description: '新的父块 ID，设置为 null 可移到根级',
      type: 'string',
      required: false
    },
    {
      name: 'prev_id',
      description: '新位置的前一个兄弟块 ID',
      type: 'string',
      required: false
    },
    {
      name: 'next_id',
      description: '新位置的下一个兄弟块 ID',
      type: 'string',
      required: false
    }
  ],
  execute: async (context: ICommandContext) => {
    const { id, parent_id, prev_id, next_id } = context.args;
    
    const result = await blocksApi.moveBlock(id, {
      parent_id,
      prev_id,
      next_id
    });

    if (result.success) {
      return {
        success: true,
        data: result.data,
        metadata: { operation: 'move', resource: 'block' }
      };
    } else {
      return {
        success: false,
        error: result.error || '移动 block 失败'
      };
    }
  }
};

/**
 * 获取子块列表命令
 * 
 * 获取指定块的所有直接子块，按照双向链表顺序返回。
 * 适用于构建层级视图或遍历块树结构。
 * 
 * @example
 * ```typescript
 * const result = await commandSystem.execute('blocks:children', {
 *   id: 'parent-block-id'
 * });
 * 
 * if (result.success) {
 *   result.data.children.forEach(child => {
 *     console.log('子块:', child.content);
 *   });
 * }
 * ```
 */
export const getBlockChildrenCommand: ICommand = {
  name: 'blocks:children',
  description: '获取指定 block 的所有子块',
  category: 'blocks',
  parameters: [
    {
      name: 'id',
      description: '父块的 ID',
      type: 'string',
      required: true
    }
  ],
  execute: async (context: ICommandContext) => {
    const { id } = context.args;
    
    const result = await blocksApi.getBlockChildren(id);

    if (result.success) {
      return {
        success: true,
        data: result.data,
        metadata: { operation: 'children', resource: 'block' }
      };
    } else {
      return {
        success: false,
        error: result.error || '获取子块失败'
      };
    }
  }
};

/**
 * 获取兄弟块列表命令
 * 
 * 获取与指定块具有相同父块的所有兄弟块，按照双向链表顺序返回。
 * 适用于同级块的导航和管理。
 * 
 * @example
 * ```typescript
 * const result = await commandSystem.execute('blocks:siblings', {
 *   id: 'block-id'
 * });
 * 
 * if (result.success) {
 *   result.data.siblings.forEach(sibling => {
 *     console.log('兄弟块:', sibling.content);
 *   });
 * }
 * ```
 */
export const getBlockSiblingsCommand: ICommand = {
  name: 'blocks:siblings',
  description: '获取指定 block 的所有兄弟块',
  category: 'blocks',
  parameters: [
    {
      name: 'id',
      description: '块的 ID',
      type: 'string',
      required: true
    }
  ],
  execute: async (context: ICommandContext) => {
    const { id } = context.args;
    
    const result = await blocksApi.getBlockSiblings(id);

    if (result.success) {
      return {
        success: true,
        data: result.data,
        metadata: { operation: 'siblings', resource: 'block' }
      };
    } else {
      return {
        success: false,
        error: result.error || '获取兄弟块失败'
      };
    }
  }
};

/**
 * 所有 blocks 相关命令的集合
 * 
 * 包含完整的 blocks 操作命令列表，可用于命令系统的批量注册。
 * 
 * @example
 * ```typescript
 * import { blocksCommands } from './commands';
 * 
 * // 注册所有 blocks 命令
 * blocksCommands.forEach(command => {
 *   commandRegistry.register(command);
 * });
 * ```
 */
export const blocksCommands = [
  createBlockCommand,
  getBlockCommand,
  updateBlockCommand,
  deleteBlockCommand,
  listBlocksCommand,
  moveBlockCommand,
  getBlockChildrenCommand,
  getBlockSiblingsCommand
];
