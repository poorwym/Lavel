/**
 * Knowledge 命令系统集成
 * 定义所有 knowledge 相关的命令，包含撤销支持
 */

import { ICommand, ICommandContext, ICommandResult } from '@lavel/command-system';
import { IUndoableCommand, ICommandSnapshot } from '@lavel/undo-system';

import {
  KnowledgeResponse,
  KnowledgeListResponse,
  KnowledgeBacklinksResponse,
  KnowledgeSearchResponse,
  CreateKnowledgeRequest,
  UpdateKnowledgeMetadataRequest,
  LinkBlockToKnowledgeRequest,
  LinkBlockToKnowledgeResponse,
  DeleteKnowledgeResponse,
  ListKnowledgesParams,
  ExportKnowledgeParams
} from '../model/knowledge.model';

import { KnowledgeService, KnowledgeServiceError, knowledgeService } from '../service/knowledge.service';

/**
 * 命令执行上下文扩展
 */
interface KnowledgeCommandContext extends ICommandContext {
  knowledgeService?: KnowledgeService;
}

/**
 * 基础 Knowledge 命令类
 */
abstract class BaseKnowledgeCommand implements ICommand {
  abstract name: string;
  abstract description: string;
  category = 'knowledge';
  requireAuth = false;
  permissions: string[] = [];

  protected getKnowledgeService(context: KnowledgeCommandContext): KnowledgeService {
    return context.knowledgeService || knowledgeService;
  }

  protected handleError(error: any): ICommandResult {
    if (error instanceof KnowledgeServiceError) {
      return {
        success: false,
        error: `Knowledge 操作失败: ${error.message} (${error.code})`
      };
    }
    
    return {
      success: false,
      error: `未知错误: ${error.message || String(error)}`
    };
  }

  abstract execute(context: KnowledgeCommandContext): Promise<ICommandResult>;
}

/**
 * 可撤销 Knowledge 命令基类
 */
abstract class UndoableKnowledgeCommand extends BaseKnowledgeCommand implements IUndoableCommand {
  undoable = true;
  
  abstract undo(snapshot: ICommandSnapshot): Promise<ICommandResult>;
  
  getUndoDescription?(snapshot: ICommandSnapshot): string {
    return `撤销 ${this.name} 操作`;
  }
}

// ============ 查询命令 (不需要撤销) ============

/**
 * 列出 knowledges 命令
 */
export class ListKnowledgesCommand extends BaseKnowledgeCommand {
  name = 'knowledge:list';
  description = '列出所有 knowledges';
  
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
      name: 'tags',
      type: 'string' as const,
      required: false,
      description: '标签筛选，逗号分隔'
    },
    {
      name: 'search',
      type: 'string' as const,
      required: false,
      description: '搜索关键词'
    }
  ];

  async execute(context: KnowledgeCommandContext): Promise<ICommandResult> {
    try {
      const service = this.getKnowledgeService(context);
      const params: ListKnowledgesParams = context.args;
      
      const result = await service.listKnowledges(params);
      
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
 * 搜索 knowledges 命令
 */
export class SearchKnowledgesCommand extends BaseKnowledgeCommand {
  name = 'knowledge:search';
  description = '搜索知识文档';
  
  parameters = [
    {
      name: 'query',
      type: 'string' as const,
      required: true,
      description: '搜索关键词'
    }
  ];

  async execute(context: KnowledgeCommandContext): Promise<ICommandResult> {
    try {
      const service = this.getKnowledgeService(context);
      const { query } = context.args;
      
      const result = await service.searchKnowledges(query);
      
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
 * 获取单个 knowledge 命令
 */
export class GetKnowledgeCommand extends BaseKnowledgeCommand {
  name = 'knowledge:get';
  description = '获取单个 knowledge 详细信息';
  
  parameters = [
    {
      name: 'knowledgeId',
      type: 'string' as const,
      required: true,
      description: 'Knowledge ID'
    }
  ];

  async execute(context: KnowledgeCommandContext): Promise<ICommandResult> {
    try {
      const service = this.getKnowledgeService(context);
      const { knowledgeId } = context.args;
      
      const result = await service.getKnowledge(knowledgeId);
      
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
 * 获取反向链接命令
 */
export class GetKnowledgeBacklinksCommand extends BaseKnowledgeCommand {
  name = 'knowledge:backlinks';
  description = '获取知识文档的反向引用列表';
  
  parameters = [
    {
      name: 'knowledgeId',
      type: 'string' as const,
      required: true,
      description: 'Knowledge ID'
    }
  ];

  async execute(context: KnowledgeCommandContext): Promise<ICommandResult> {
    try {
      const service = this.getKnowledgeService(context);
      const { knowledgeId } = context.args;
      
      const result = await service.getKnowledgeBacklinks(knowledgeId);
      
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
 * 导出 Markdown 命令
 */
export class ExportKnowledgeToMarkdownCommand extends BaseKnowledgeCommand {
  name = 'knowledge:export-markdown';
  description = '导出知识文档为 Markdown 格式';
  
  parameters = [
    {
      name: 'knowledgeId',
      type: 'string' as const,
      required: true,
      description: 'Knowledge ID'
    },
    {
      name: 'include_metadata',
      type: 'boolean' as const,
      required: false,
      defaultValue: true,
      description: '是否包含元数据'
    },
    {
      name: 'include_backlinks',
      type: 'boolean' as const,
      required: false,
      defaultValue: false,
      description: '是否包含反向链接'
    }
  ];

  async execute(context: KnowledgeCommandContext): Promise<ICommandResult> {
    try {
      const service = this.getKnowledgeService(context);
      const { knowledgeId, ...params } = context.args;
      
      const result = await service.exportKnowledgeToMarkdown(knowledgeId, params);
      
      return {
        success: true,
        data: { markdown: result }
      };
    } catch (error) {
      return this.handleError(error);
    }
  }
}

/**
 * 根据标签获取 knowledges 命令
 */
export class GetKnowledgesByTagsCommand extends BaseKnowledgeCommand {
  name = 'knowledge:by-tags';
  description = '根据标签获取知识文档';
  
  parameters = [
    {
      name: 'tags',
      type: 'array' as const,
      required: true,
      description: '标签数组'
    }
  ];

  async execute(context: KnowledgeCommandContext): Promise<ICommandResult> {
    try {
      const service = this.getKnowledgeService(context);
      const { tags } = context.args;
      
      const result = await service.getKnowledgesByTags(tags);
      
      return {
        success: true,
        data: { knowledges: result }
      };
    } catch (error) {
      return this.handleError(error);
    }
  }
}

// ============ 修改命令 (需要撤销) ============

/**
 * 创建 knowledge 命令
 */
export class CreateKnowledgeCommand extends UndoableKnowledgeCommand {
  name = 'knowledge:create';
  description = '创建新的知识文档';
  
  parameters = [
    {
      name: 'title',
      type: 'string' as const,
      required: true,
      description: '文档标题'
    },
    {
      name: 'description',
      type: 'string' as const,
      required: false,
      description: '文档描述'
    },
    {
      name: 'tags',
      type: 'array' as const,
      required: false,
      description: '标签列表'
    },
    {
      name: 'content',
      type: 'string' as const,
      required: false,
      description: '初始内容'
    },
    {
      name: 'linked_blocks',
      type: 'array' as const,
      required: false,
      description: '链接的 blocks'
    },
    {
      name: 'id',
      type: 'string' as const,
      required: false,
      description: '指定的知识文档 ID'
    }
  ];

  async execute(context: KnowledgeCommandContext): Promise<ICommandResult> {
    try {
      const service = this.getKnowledgeService(context);
      const request: CreateKnowledgeRequest = context.args;
      
      const result = await service.createKnowledge(request);
      
      // 保存创建的 knowledge ID 用于撤销
      context.env.createdKnowledgeId = result.id;
      
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
      const service = (snapshot.context as KnowledgeCommandContext).knowledgeService || knowledgeService;
      const knowledgeId = snapshot.context.env.createdKnowledgeId;
      
      if (!knowledgeId) {
        return {
          success: false,
          error: '无法撤销：缺少创建的 knowledge ID'
        };
      }

      await service.deleteKnowledge(knowledgeId);
      
      return {
        success: true,
        data: { message: `已撤销创建 knowledge: ${knowledgeId}` }
      };
    } catch (error) {
      return {
        success: false,
        error: `撤销创建失败: ${(error as any).message}`
      };
    }
  }

  getUndoDescription(snapshot: ICommandSnapshot): string {
    const knowledgeId = snapshot.context.env.createdKnowledgeId;
    return `撤销创建 knowledge: ${knowledgeId}`;
  }
}

/**
 * 更新 knowledge 元数据命令
 */
export class UpdateKnowledgeMetadataCommand extends UndoableKnowledgeCommand {
  name = 'knowledge:update-metadata';
  description = '更新知识文档的元数据';
  
  parameters = [
    {
      name: 'knowledgeId',
      type: 'string' as const,
      required: true,
      description: 'Knowledge ID'
    },
    {
      name: 'title',
      type: 'string' as const,
      required: false,
      description: '新标题'
    },
    {
      name: 'description',
      type: 'string' as const,
      required: false,
      description: '新描述'
    },
    {
      name: 'tags',
      type: 'array' as const,
      required: false,
      description: '新标签列表'
    },
    {
      name: 'linked_blocks',
      type: 'array' as const,
      required: false,
      description: '新的链接 blocks'
    }
  ];

  async execute(context: KnowledgeCommandContext): Promise<ICommandResult> {
    try {
      const service = this.getKnowledgeService(context);
      const { knowledgeId, ...updateData } = context.args;
      
      // 获取原始状态用于撤销
      const originalKnowledge = await service.getKnowledge(knowledgeId);
      context.env.originalKnowledge = originalKnowledge;
      
      const result = await service.updateKnowledgeMetadata(knowledgeId, updateData);
      
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
      const service = (snapshot.context as KnowledgeCommandContext).knowledgeService || knowledgeService;
      const originalKnowledge = snapshot.context.env.originalKnowledge;
      const knowledgeId = snapshot.context.args.knowledgeId;
      
      if (!originalKnowledge) {
        return {
          success: false,
          error: '无法撤销：缺少原始 knowledge 状态'
        };
      }

      // 恢复原始状态
      const restoreData = {
        title: originalKnowledge.title,
        description: originalKnowledge.description,
        tags: originalKnowledge.tags,
        linked_blocks: originalKnowledge.linked_blocks
      };

      await service.updateKnowledgeMetadata(knowledgeId, restoreData);
      
      return {
        success: true,
        data: { message: `已撤销更新 knowledge: ${knowledgeId}` }
      };
    } catch (error) {
      return {
        success: false,
        error: `撤销更新失败: ${(error as any).message}`
      };
    }
  }

  getUndoDescription(snapshot: ICommandSnapshot): string {
    const knowledgeId = snapshot.context.args.knowledgeId;
    return `撤销更新 knowledge: ${knowledgeId}`;
  }
}

/**
 * 删除 knowledge 命令
 */
export class DeleteKnowledgeCommand extends UndoableKnowledgeCommand {
  name = 'knowledge:delete';
  description = '删除知识文档';
  
  parameters = [
    {
      name: 'knowledgeId',
      type: 'string' as const,
      required: true,
      description: 'Knowledge ID'
    }
  ];

  async execute(context: KnowledgeCommandContext): Promise<ICommandResult> {
    try {
      const service = this.getKnowledgeService(context);
      const { knowledgeId } = context.args;
      
      // 获取原始状态用于撤销
      const originalKnowledge = await service.getKnowledge(knowledgeId);
      context.env.originalKnowledge = originalKnowledge;
      
      const result = await service.deleteKnowledge(knowledgeId);
      
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
      const service = (snapshot.context as KnowledgeCommandContext).knowledgeService || knowledgeService;
      const originalKnowledge = snapshot.context.env.originalKnowledge;
      
      if (!originalKnowledge) {
        return {
          success: false,
          error: '无法撤销：缺少原始 knowledge 状态'
        };
      }

      // 重新创建被删除的 knowledge
      const createData: CreateKnowledgeRequest = {
        id: originalKnowledge.id,
        title: originalKnowledge.title,
        description: originalKnowledge.description,
        tags: originalKnowledge.tags,
        linked_blocks: originalKnowledge.linked_blocks
      };

      await service.createKnowledge(createData);
      
      return {
        success: true,
        data: { message: `已撤销删除 knowledge: ${originalKnowledge.id}` }
      };
    } catch (error) {
      return {
        success: false,
        error: `撤销删除失败: ${(error as any).message}`
      };
    }
  }

  getUndoDescription(snapshot: ICommandSnapshot): string {
    const originalKnowledge = snapshot.context.env.originalKnowledge;
    return `撤销删除 knowledge: ${originalKnowledge?.id}`;
  }
}

/**
 * 链接 block 到 knowledge 命令
 */
export class LinkBlockToKnowledgeCommand extends UndoableKnowledgeCommand {
  name = 'knowledge:link-block';
  description = '将 block 链接到知识文档';
  
  parameters = [
    {
      name: 'knowledgeId',
      type: 'string' as const,
      required: true,
      description: 'Knowledge ID'
    },
    {
      name: 'block_id',
      type: 'string' as const,
      required: true,
      description: '要链接的 block ID'
    },
    {
      name: 'position',
      type: 'number' as const,
      required: false,
      description: '插入位置'
    },
    {
      name: 'link_type',
      type: 'string' as const,
      required: false,
      defaultValue: 'reference',
      description: '链接类型'
    }
  ];

  async execute(context: KnowledgeCommandContext): Promise<ICommandResult> {
    try {
      const service = this.getKnowledgeService(context);
      const { knowledgeId, ...linkData } = context.args;
      
      // 获取原始状态用于撤销
      const originalKnowledge = await service.getKnowledge(knowledgeId);
      context.env.originalKnowledge = originalKnowledge;
      context.env.linkedBlockId = linkData.block_id;
      
      const result = await service.linkBlockToKnowledge(knowledgeId, linkData);
      
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
      const service = (snapshot.context as KnowledgeCommandContext).knowledgeService || knowledgeService;
      const originalKnowledge = snapshot.context.env.originalKnowledge;
      const knowledgeId = snapshot.context.args.knowledgeId;
      
      if (!originalKnowledge) {
        return {
          success: false,
          error: '无法撤销：缺少原始 knowledge 状态'
        };
      }

      // 恢复原始链接状态
      const restoreData = {
        linked_blocks: originalKnowledge.linked_blocks
      };

      await service.updateKnowledgeMetadata(knowledgeId, restoreData);
      
      return {
        success: true,
        data: { message: `已撤销链接操作: ${knowledgeId}` }
      };
    } catch (error) {
      return {
        success: false,
        error: `撤销链接失败: ${(error as any).message}`
      };
    }
  }

  getUndoDescription(snapshot: ICommandSnapshot): string {
    const knowledgeId = snapshot.context.args.knowledgeId;
    const blockId = snapshot.context.env.linkedBlockId;
    return `撤销链接 block ${blockId} 到 knowledge ${knowledgeId}`;
  }
}

/**
 * 批量创建 knowledges 命令
 */
export class CreateKnowledgesCommand extends UndoableKnowledgeCommand {
  name = 'knowledge:create-batch';
  description = '批量创建知识文档';
  
  parameters = [
    {
      name: 'knowledges',
      type: 'array' as const,
      required: true,
      description: 'Knowledge 创建请求数组'
    }
  ];

  async execute(context: KnowledgeCommandContext): Promise<ICommandResult> {
    try {
      const service = this.getKnowledgeService(context);
      const { knowledges } = context.args;
      
      const results = await service.createKnowledges(knowledges);
      
      // 保存创建的 knowledge IDs 用于撤销
      context.env.createdKnowledgeIds = results.map(knowledge => knowledge.id);
      
      return {
        success: true,
        data: { knowledges: results }
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async undo(snapshot: ICommandSnapshot): Promise<ICommandResult> {
    try {
      const service = (snapshot.context as KnowledgeCommandContext).knowledgeService || knowledgeService;
      const knowledgeIds = snapshot.context.env.createdKnowledgeIds;
      
      if (!knowledgeIds || !Array.isArray(knowledgeIds)) {
        return {
          success: false,
          error: '无法撤销：缺少创建的 knowledge IDs'
        };
      }

      // 删除所有创建的 knowledges
      const errors: string[] = [];
      for (const knowledgeId of knowledgeIds) {
        try {
          await service.deleteKnowledge(knowledgeId);
        } catch (error) {
          errors.push(`删除 ${knowledgeId} 失败: ${(error as any).message}`);
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
        data: { message: `已撤销批量创建 ${knowledgeIds.length} 个 knowledges` }
      };
    } catch (error) {
      return {
        success: false,
        error: `撤销批量创建失败: ${(error as any).message}`
      };
    }
  }

  getUndoDescription(snapshot: ICommandSnapshot): string {
    const knowledgeIds = snapshot.context.env.createdKnowledgeIds;
    const count = knowledgeIds?.length || 0;
    return `撤销批量创建 ${count} 个 knowledges`;
  }
}

// ============ 命令注册和导出 ============

/**
 * 所有 knowledge 命令
 */
export const knowledgeCommands: ICommand[] = [
  // 查询命令
  new ListKnowledgesCommand(),
  new SearchKnowledgesCommand(),
  new GetKnowledgeCommand(),
  new GetKnowledgeBacklinksCommand(),
  new ExportKnowledgeToMarkdownCommand(),
  new GetKnowledgesByTagsCommand(),
  
  // 修改命令（支持撤销）
  new CreateKnowledgeCommand(),
  new UpdateKnowledgeMetadataCommand(),
  new DeleteKnowledgeCommand(),
  new LinkBlockToKnowledgeCommand(),
  new CreateKnowledgesCommand()
];

/**
 * 注册所有 knowledge 命令到命令系统
 */
export function registerKnowledgeCommands(commandSystem: any): void {
  knowledgeCommands.forEach(command => {
    commandSystem.register(command);
  });
}

/**
 * 获取指定名称的命令
 */
export function getKnowledgeCommand(name: string): ICommand | undefined {
  return knowledgeCommands.find(cmd => cmd.name === name);
}

/**
 * 获取所有可撤销的 knowledge 命令
 */
export function getUndoableKnowledgeCommands(): IUndoableCommand[] {
  return knowledgeCommands.filter(cmd => 'undoable' in cmd && cmd.undoable) as IUndoableCommand[];
} 