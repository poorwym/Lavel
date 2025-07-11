/**
 * Block 命令系统集成
 * 定义所有 block 相关的命令，包含撤销支持
 */

import { ICommand, ICommandContext, ICommandResult } from '@lavel/command-system';
import { IUndoableCommand, ICommandSnapshot } from '@lavel/undo-system';

import {
  BlockResponse,
  BlockListResponse,
  BlockChildrenResponse,
  BlockSiblingsResponse,
  CreateBlockRequest,
  UpdateBlockRequest,
  ReplaceBlockRequest,
  MoveBlockRequest,
  MoveBlockResponse,
  DeleteBlockResponse,
  ListBlocksParams
} from '../model/block.model';

import { BlockService, BlockServiceError, blockService } from '../service/block.service';

/**
 * 命令执行上下文扩展
 */
interface BlockCommandContext extends ICommandContext {
  blockService?: BlockService;
}

/**
 * 基础 Block 命令类
 */
abstract class BaseBlockCommand implements ICommand {
  abstract name: string;
  abstract description: string;
  category = 'block';
  requireAuth = false;
  permissions: string[] = [];

  protected getBlockService(context: BlockCommandContext): BlockService {
    return context.blockService || blockService;
  }

  protected handleError(error: any): ICommandResult {
    if (error instanceof BlockServiceError) {
      return {
        success: false,
        error: `Block 操作失败: ${error.message} (${error.code})`
      };
    }
    
    return {
      success: false,
      error: `未知错误: ${error.message || String(error)}`
    };
  }

  abstract execute(context: BlockCommandContext): Promise<ICommandResult>;
}

/**
 * 可撤销 Block 命令基类
 */
abstract class UndoableBlockCommand extends BaseBlockCommand implements IUndoableCommand {
  undoable = true;
  
  abstract undo(snapshot: ICommandSnapshot): Promise<ICommandResult>;
  
  getUndoDescription?(snapshot: ICommandSnapshot): string {
    return `撤销 ${this.name} 操作`;
  }
}

// ============ 查询命令 (不需要撤销) ============

/**
 * 列出 blocks 命令
 */
export class ListBlocksCommand extends BaseBlockCommand {
  name = 'block:list';
  description = '列出所有 blocks';
  
  parameters = [
    {
      name: 'page',
      type: 'number' as const,
      required: false,
      defaultValue: 1,
      description: '页码'
    },
    {
      name: 'limit',
      type: 'number' as const,
      required: false,
      defaultValue: 20,
      description: '每页数量'
    },
    {
      name: 'parent_id',
      type: 'string' as const,
      required: false,
      description: '父块ID筛选'
    },
    {
      name: 'tags',
      type: 'string' as const,
      required: false,
      description: '标签筛选，逗号分隔'
    }
  ];

  async execute(context: BlockCommandContext): Promise<ICommandResult> {
    try {
      const service = this.getBlockService(context);
      const params: ListBlocksParams = context.args;
      
      const result = await service.listBlocks(params);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return this.handleError(error);
    }
  }
}

/**
 * 获取单个 block 命令
 */
export class GetBlockCommand extends BaseBlockCommand {
  name = 'block:get';
  description = '获取单个 block 详细信息';
  
  parameters = [
    {
      name: 'blockId',
      type: 'string' as const,
      required: true,
      description: 'Block ID'
    }
  ];

  async execute(context: BlockCommandContext): Promise<ICommandResult> {
    try {
      const service = this.getBlockService(context);
      const { blockId } = context.args;
      
      const result = await service.getBlock(blockId);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return this.handleError(error);
    }
  }
}

/**
 * 获取子 blocks 命令
 */
export class GetBlockChildrenCommand extends BaseBlockCommand {
  name = 'block:children';
  description = '获取指定 block 的所有子块';
  
  parameters = [
    {
      name: 'blockId',
      type: 'string' as const,
      required: true,
      description: 'Parent Block ID'
    }
  ];

  async execute(context: BlockCommandContext): Promise<ICommandResult> {
    try {
      const service = this.getBlockService(context);
      const { blockId } = context.args;
      
      const result = await service.getBlockChildren(blockId);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return this.handleError(error);
    }
  }
}

/**
 * 获取兄弟 blocks 命令
 */
export class GetBlockSiblingsCommand extends BaseBlockCommand {
  name = 'block:siblings';
  description = '获取指定 block 的所有兄弟块';
  
  parameters = [
    {
      name: 'blockId',
      type: 'string' as const,
      required: true,
      description: 'Block ID'
    }
  ];

  async execute(context: BlockCommandContext): Promise<ICommandResult> {
    try {
      const service = this.getBlockService(context);
      const { blockId } = context.args;
      
      const result = await service.getBlockSiblings(blockId);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return this.handleError(error);
    }
  }
}

/**
 * 获取 block 树命令
 */
export class GetBlockTreeCommand extends BaseBlockCommand {
  name = 'block:tree';
  description = '获取完整的 block 树结构';
  
  parameters = [
    {
      name: 'rootId',
      type: 'string' as const,
      required: false,
      description: '根 Block ID，不提供则获取顶级 blocks'
    }
  ];

  async execute(context: BlockCommandContext): Promise<ICommandResult> {
    try {
      const service = this.getBlockService(context);
      const { rootId } = context.args;
      
      const result = await service.getBlockTree(rootId);
      
      return {
        success: true,
        data: { blocks: result }
      };
    } catch (error) {
      return this.handleError(error);
    }
  }
}

// ============ 修改命令 (需要撤销) ============

/**
 * 创建 block 命令
 */
export class CreateBlockCommand extends UndoableBlockCommand {
  name = 'block:create';
  description = '创建新的 block';
  
  parameters = [
    {
      name: 'content',
      type: 'string' as const,
      required: true,
      description: 'Block 内容'
    },
    {
      name: 'id',
      type: 'string' as const,
      required: false,
      description: '指定的 Block ID'
    },
    {
      name: 'parent_id',
      type: 'string' as const,
      required: false,
      description: '父块 ID'
    },
    {
      name: 'prev_id',
      type: 'string' as const,
      required: false,
      description: '前一个兄弟块 ID'
    },
    {
      name: 'next_id',
      type: 'string' as const,
      required: false,
      description: '后一个兄弟块 ID'
    },
    {
      name: 'first_child_id',
      type: 'string' as const,
      required: false,
      description: '第一个子块 ID'
    }
  ];

  async execute(context: BlockCommandContext): Promise<ICommandResult> {
    try {
      const service = this.getBlockService(context);
      const request: CreateBlockRequest = context.args;
      
      const result = await service.createBlock(request);
      
      // 保存创建的 block ID 用于撤销
      context.env.createdBlockId = result.id;
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async undo(snapshot: ICommandSnapshot): Promise<ICommandResult> {
    try {
      // 尝试使用上下文中的服务，否则使用默认服务
      const service = (snapshot.context as BlockCommandContext).blockService || blockService;
      const blockId = snapshot.context.env.createdBlockId;
      
      if (!blockId) {
        return {
          success: false,
          error: '无法撤销：缺少创建的 block ID'
        };
      }

      await service.deleteBlock(blockId);
      
      return {
        success: true,
        data: { message: `已撤销创建 block: ${blockId}` }
      };
    } catch (error) {
      return {
        success: false,
        error: `撤销创建失败: ${error.message}`
      };
    }
  }

  getUndoDescription(snapshot: ICommandSnapshot): string {
    const blockId = snapshot.context.env.createdBlockId;
    return `撤销创建 block: ${blockId}`;
  }
}

/**
 * 更新 block 命令
 */
export class UpdateBlockCommand extends UndoableBlockCommand {
  name = 'block:update';
  description = '部分更新 block';
  
  parameters = [
    {
      name: 'blockId',
      type: 'string' as const,
      required: true,
      description: 'Block ID'
    },
    {
      name: 'content',
      type: 'string' as const,
      required: false,
      description: 'Block 内容'
    },
    {
      name: 'parent_id',
      type: 'string' as const,
      required: false,
      description: '父块 ID'
    },
    {
      name: 'prev_id',
      type: 'string' as const,
      required: false,
      description: '前一个兄弟块 ID'
    },
    {
      name: 'next_id',
      type: 'string' as const,
      required: false,
      description: '后一个兄弟块 ID'
    },
    {
      name: 'first_child_id',
      type: 'string' as const,
      required: false,
      description: '第一个子块 ID'
    }
  ];

  async execute(context: BlockCommandContext): Promise<ICommandResult> {
    try {
      const service = this.getBlockService(context);
      const { blockId, ...updateData } = context.args;
      
      // 获取原始状态用于撤销
      const originalBlock = await service.getBlock(blockId);
      context.env.originalBlock = originalBlock;
      
      const result = await service.updateBlock(blockId, updateData);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async undo(snapshot: ICommandSnapshot): Promise<ICommandResult> {
    try {
      const service = (snapshot.context as BlockCommandContext).blockService || blockService;
      const originalBlock = snapshot.context.env.originalBlock;
      const blockId = snapshot.context.args.blockId;
      
      if (!originalBlock) {
        return {
          success: false,
          error: '无法撤销：缺少原始 block 状态'
        };
      }

      // 恢复原始状态
      const restoreData = {
        content: originalBlock.content,
        parent_id: originalBlock.parent_id,
        prev_id: originalBlock.prev_id,
        next_id: originalBlock.next_id,
        first_child_id: originalBlock.first_child_id
      };

      await service.updateBlock(blockId, restoreData);
      
      return {
        success: true,
        data: { message: `已撤销更新 block: ${blockId}` }
      };
    } catch (error) {
      return {
        success: false,
        error: `撤销更新失败: ${error.message}`
      };
    }
  }

  getUndoDescription(snapshot: ICommandSnapshot): string {
    const blockId = snapshot.context.args.blockId;
    return `撤销更新 block: ${blockId}`;
  }
}

/**
 * 替换 block 命令
 */
export class ReplaceBlockCommand extends UndoableBlockCommand {
  name = 'block:replace';
  description = '完全替换 block';
  
  parameters = [
    {
      name: 'blockId',
      type: 'string' as const,
      required: true,
      description: 'Block ID'
    },
    {
      name: 'content',
      type: 'string' as const,
      required: true,
      description: 'Block 内容'
    },
    {
      name: 'parent_id',
      type: 'string' as const,
      required: false,
      description: '父块 ID'
    },
    {
      name: 'prev_id',
      type: 'string' as const,
      required: false,
      description: '前一个兄弟块 ID'
    },
    {
      name: 'next_id',
      type: 'string' as const,
      required: false,
      description: '后一个兄弟块 ID'
    },
    {
      name: 'first_child_id',
      type: 'string' as const,
      required: false,
      description: '第一个子块 ID'
    }
  ];

  async execute(context: BlockCommandContext): Promise<ICommandResult> {
    try {
      const service = this.getBlockService(context);
      const { blockId, ...replaceData } = context.args;
      
      // 获取原始状态用于撤销
      const originalBlock = await service.getBlock(blockId);
      context.env.originalBlock = originalBlock;
      
      const result = await service.replaceBlock(blockId, replaceData);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async undo(snapshot: ICommandSnapshot): Promise<ICommandResult> {
    try {
      const service = (snapshot.context as BlockCommandContext).blockService || blockService;
      const originalBlock = snapshot.context.env.originalBlock;
      const blockId = snapshot.context.args.blockId;
      
      if (!originalBlock) {
        return {
          success: false,
          error: '无法撤销：缺少原始 block 状态'
        };
      }

      // 恢复原始状态
      const restoreData = {
        content: originalBlock.content,
        parent_id: originalBlock.parent_id,
        prev_id: originalBlock.prev_id,
        next_id: originalBlock.next_id,
        first_child_id: originalBlock.first_child_id
      };

      await service.replaceBlock(blockId, restoreData);
      
      return {
        success: true,
        data: { message: `已撤销替换 block: ${blockId}` }
      };
    } catch (error) {
      return {
        success: false,
        error: `撤销替换失败: ${error.message}`
      };
    }
  }

  getUndoDescription(snapshot: ICommandSnapshot): string {
    const blockId = snapshot.context.args.blockId;
    return `撤销替换 block: ${blockId}`;
  }
}

/**
 * 删除 block 命令
 */
export class DeleteBlockCommand extends UndoableBlockCommand {
  name = 'block:delete';
  description = '删除 block';
  
  parameters = [
    {
      name: 'blockId',
      type: 'string' as const,
      required: true,
      description: 'Block ID'
    }
  ];

  async execute(context: BlockCommandContext): Promise<ICommandResult> {
    try {
      const service = this.getBlockService(context);
      const { blockId } = context.args;
      
      // 获取原始状态用于撤销
      const originalBlock = await service.getBlock(blockId);
      context.env.originalBlock = originalBlock;
      
      const result = await service.deleteBlock(blockId);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async undo(snapshot: ICommandSnapshot): Promise<ICommandResult> {
    try {
      const service = (snapshot.context as BlockCommandContext).blockService || blockService;
      const originalBlock = snapshot.context.env.originalBlock;
      
      if (!originalBlock) {
        return {
          success: false,
          error: '无法撤销：缺少原始 block 状态'
        };
      }

      // 重新创建被删除的 block
      const createData: CreateBlockRequest = {
        id: originalBlock.id,
        content: originalBlock.content,
        parent_id: originalBlock.parent_id,
        prev_id: originalBlock.prev_id,
        next_id: originalBlock.next_id,
        first_child_id: originalBlock.first_child_id
      };

      await service.createBlock(createData);
      
      return {
        success: true,
        data: { message: `已撤销删除 block: ${originalBlock.id}` }
      };
    } catch (error) {
      return {
        success: false,
        error: `撤销删除失败: ${error.message}`
      };
    }
  }

  getUndoDescription(snapshot: ICommandSnapshot): string {
    const originalBlock = snapshot.context.env.originalBlock;
    return `撤销删除 block: ${originalBlock?.id}`;
  }
}

/**
 * 移动 block 命令
 */
export class MoveBlockCommand extends UndoableBlockCommand {
  name = 'block:move';
  description = '移动 block 位置';
  
  parameters = [
    {
      name: 'blockId',
      type: 'string' as const,
      required: true,
      description: 'Block ID'
    },
    {
      name: 'parent_id',
      type: 'string' as const,
      required: false,
      description: '新的父块 ID'
    },
    {
      name: 'prev_id',
      type: 'string' as const,
      required: false,
      description: '新的前一个兄弟块 ID'
    },
    {
      name: 'next_id',
      type: 'string' as const,
      required: false,
      description: '新的后一个兄弟块 ID'
    }
  ];

  async execute(context: BlockCommandContext): Promise<ICommandResult> {
    try {
      const service = this.getBlockService(context);
      const { blockId, ...moveData } = context.args;
      
      // 获取原始位置用于撤销
      const originalBlock = await service.getBlock(blockId);
      context.env.originalPosition = {
        parent_id: originalBlock.parent_id,
        prev_id: originalBlock.prev_id,
        next_id: originalBlock.next_id
      };
      
      const result = await service.moveBlock(blockId, moveData);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async undo(snapshot: ICommandSnapshot): Promise<ICommandResult> {
    try {
      const service = (snapshot.context as BlockCommandContext).blockService || blockService;
      const originalPosition = snapshot.context.env.originalPosition;
      const blockId = snapshot.context.args.blockId;
      
      if (!originalPosition) {
        return {
          success: false,
          error: '无法撤销：缺少原始位置信息'
        };
      }

      // 恢复原始位置
      await service.moveBlock(blockId, originalPosition);
      
      return {
        success: true,
        data: { message: `已撤销移动 block: ${blockId}` }
      };
    } catch (error) {
      return {
        success: false,
        error: `撤销移动失败: ${error.message}`
      };
    }
  }

  getUndoDescription(snapshot: ICommandSnapshot): string {
    const blockId = snapshot.context.args.blockId;
    return `撤销移动 block: ${blockId}`;
  }
}

/**
 * 批量创建 blocks 命令
 */
export class CreateBlocksCommand extends UndoableBlockCommand {
  name = 'block:create-batch';
  description = '批量创建 blocks';
  
  parameters = [
    {
      name: 'blocks',
      type: 'array' as const,
      required: true,
      description: 'Block 创建请求数组'
    }
  ];

  async execute(context: BlockCommandContext): Promise<ICommandResult> {
    try {
      const service = this.getBlockService(context);
      const { blocks } = context.args;
      
      const results = await service.createBlocks(blocks);
      
      // 保存创建的 block IDs 用于撤销
      context.env.createdBlockIds = results.map(block => block.id);
      
      return {
        success: true,
        data: { blocks: results }
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async undo(snapshot: ICommandSnapshot): Promise<ICommandResult> {
    try {
      const service = (snapshot.context as BlockCommandContext).blockService || blockService;
      const blockIds = snapshot.context.env.createdBlockIds;
      
      if (!blockIds || !Array.isArray(blockIds)) {
        return {
          success: false,
          error: '无法撤销：缺少创建的 block IDs'
        };
      }

      // 删除所有创建的 blocks
      const errors: string[] = [];
      for (const blockId of blockIds) {
        try {
          await service.deleteBlock(blockId);
        } catch (error) {
          errors.push(`删除 ${blockId} 失败: ${error.message}`);
        }
      }

      if (errors.length > 0) {
        return {
          success: false,
          error: `部分撤销失败: ${errors.join(', ')}`
        };
      }
      
      return {
        success: true,
        data: { message: `已撤销批量创建 ${blockIds.length} 个 blocks` }
      };
    } catch (error) {
      return {
        success: false,
        error: `撤销批量创建失败: ${error.message}`
      };
    }
  }

  getUndoDescription(snapshot: ICommandSnapshot): string {
    const blockIds = snapshot.context.env.createdBlockIds;
    const count = blockIds?.length || 0;
    return `撤销批量创建 ${count} 个 blocks`;
  }
}

// ============ 命令注册和导出 ============

/**
 * 所有 block 命令
 */
export const blockCommands: ICommand[] = [
  // 查询命令
  new ListBlocksCommand(),
  new GetBlockCommand(),
  new GetBlockChildrenCommand(),
  new GetBlockSiblingsCommand(),
  new GetBlockTreeCommand(),
  
  // 修改命令（支持撤销）
  new CreateBlockCommand(),
  new UpdateBlockCommand(),
  new ReplaceBlockCommand(),
  new DeleteBlockCommand(),
  new MoveBlockCommand(),
  new CreateBlocksCommand()
];

/**
 * 注册所有 block 命令到命令系统
 */
export function registerBlockCommands(commandSystem: any): void {
  blockCommands.forEach(command => {
    commandSystem.register(command);
  });
}

/**
 * 获取指定名称的命令
 */
export function getBlockCommand(name: string): ICommand | undefined {
  return blockCommands.find(cmd => cmd.name === name);
}

/**
 * 获取所有可撤销的 block 命令
 */
export function getUndoableBlockCommands(): IUndoableCommand[] {
  return blockCommands.filter(cmd => 'undoable' in cmd && cmd.undoable) as IUndoableCommand[];
} 