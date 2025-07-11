/**
 * @lavel/knowledge 核心模块
 * 
 * 提供知识文档管理的完整功能，包括：
 * - 数据模型定义
 * - API 客户端封装  
 * - 核心业务逻辑服务
 * - 命令系统集成（含撤销支持）
 * 
 * @version 1.0.0
 * @author alex
 */

// ============ 数据模型导出 ============
export type {
  Knowledge,
  CreateKnowledgeRequest,
  UpdateKnowledgeMetadataRequest,
  LinkBlockToKnowledgeRequest,
  KnowledgeResponse,
  KnowledgeListResponse,
  KnowledgeBacklinksResponse,
  KnowledgeSearchResponse,
  LinkBlockToKnowledgeResponse,
  DeleteKnowledgeResponse,
  PaginationInfo,
  BacklinkItem,
  KnowledgeSearchResultItem,
  ListKnowledgesParams,
  ExportKnowledgeParams,
  ApiError
} from './model/knowledge.model';

// ============ API 客户端导出 ============
export {
  KnowledgeApi,
  KnowledgeApiError,
  knowledgeApi,
  createKnowledgeApi
} from './api/knowledge.api';

export type { ApiConfig } from './api/knowledge.api';

// ============ 服务层导出 ============
export {
  KnowledgeService,
  KnowledgeServiceError,
  knowledgeService,
  createKnowledgeService
} from './service/knowledge.service';

export type {
  KnowledgeServiceConfig,
  KnowledgeValidationRules
} from './service/knowledge.service';

// ============ 命令系统导出 ============
export {
  // 查询命令
  ListKnowledgesCommand,
  SearchKnowledgesCommand,
  GetKnowledgeCommand,
  GetKnowledgeBacklinksCommand,
  ExportKnowledgeToMarkdownCommand,
  GetKnowledgesByTagsCommand,
  
  // 修改命令（支持撤销）
  CreateKnowledgeCommand,
  UpdateKnowledgeMetadataCommand,
  DeleteKnowledgeCommand,
  LinkBlockToKnowledgeCommand,
  CreateKnowledgesCommand,
  
  // 工具函数
  knowledgeCommands,
  registerKnowledgeCommands,
  getKnowledgeCommand,
  getUndoableKnowledgeCommands
} from './command/knowledge.commands';

// ============ 便利函数和工具 ============

/**
 * 初始化 Knowledge 模块
 * 
 * @param config 可选的配置参数
 * @returns 初始化的服务和 API 实例
 */
export async function initializeKnowledgeModule(config?: {
  apiConfig?: import('./api/knowledge.api').ApiConfig;
  serviceConfig?: import('./service/knowledge.service').KnowledgeServiceConfig;
  validationRules?: import('./service/knowledge.service').KnowledgeValidationRules;
}) {
  // 动态导入以避免循环依赖
  const apiModule = await import('./api/knowledge.api');
  const serviceModule = await import('./service/knowledge.service');
  const commandModule = await import('./command/knowledge.commands');

  const api = config?.apiConfig 
    ? apiModule.createKnowledgeApi(config.apiConfig)
    : apiModule.knowledgeApi;
    
  const service = config?.serviceConfig || config?.validationRules
    ? serviceModule.createKnowledgeService(
        { ...config?.serviceConfig, api },
        config?.validationRules
      )
    : serviceModule.knowledgeService;

  return {
    api,
    service,
    commands: commandModule.knowledgeCommands
  };
}

/**
 * 快速创建 knowledge
 * 
 * @param title 知识标题
 * @param options 可选配置
 * @returns Promise<KnowledgeResponse>
 */
export async function createQuickKnowledge(
  title: string,
  options?: {
    description?: string;
    tags?: string[];
    content?: string;
    service?: KnowledgeService;
  }
): Promise<import('./model/knowledge.model').KnowledgeResponse> {
  const service = options?.service || (await import('./service/knowledge.service')).knowledgeService;
  
  return service.createKnowledge({
    title,
    description: options?.description,
    tags: options?.tags,
    content: options?.content
  });
}

/**
 * 批量标签操作
 * 
 * @param knowledgeIds Knowledge IDs 数组
 * @param tags 要添加或设置的标签
 * @param mode 操作模式：'add' | 'remove' | 'replace'
 * @param service 可选的服务实例
 * @returns Promise<KnowledgeResponse[]>
 */
export async function batchUpdateKnowledgeTags(
  knowledgeIds: string[],
  tags: string[],
  mode: 'add' | 'remove' | 'replace' = 'add',
  service?: KnowledgeService
): Promise<import('./model/knowledge.model').KnowledgeResponse[]> {
  const knowledgeService = service || (await import('./service/knowledge.service')).knowledgeService;
  const results: import('./model/knowledge.model').KnowledgeResponse[] = [];

  for (const knowledgeId of knowledgeIds) {
    try {
      const knowledge = await knowledgeService.getKnowledge(knowledgeId);
      
      let newTags: string[];
      switch (mode) {
        case 'add':
          newTags = [...new Set([...knowledge.tags, ...tags])];
          break;
        case 'remove':
          newTags = knowledge.tags.filter(tag => !tags.includes(tag));
          break;
        case 'replace':
          newTags = [...tags];
          break;
        default:
          throw new Error(`Unsupported mode: ${mode}`);
      }

      const updatedKnowledge = await knowledgeService.updateKnowledgeMetadata(
        knowledgeId,
        { tags: newTags }
      );
      
      results.push(updatedKnowledge);
    } catch (error) {
      console.error(`Failed to update tags for knowledge ${knowledgeId}:`, error);
      // 继续处理其他 knowledge，不中断批量操作
    }
  }

  return results;
}

/**
 * 搜索并导出 knowledge
 * 
 * @param searchQuery 搜索关键词
 * @param exportOptions 导出配置
 * @param service 可选的服务实例
 * @returns Promise<{ knowledge: KnowledgeResponse, markdown: string }[]>
 */
export async function searchAndExportKnowledges(
  searchQuery: string,
  exportOptions?: import('./model/knowledge.model').ExportKnowledgeParams,
  service?: KnowledgeService
): Promise<Array<{
  knowledge: import('./model/knowledge.model').KnowledgeResponse;
  markdown: string;
}>> {
  const knowledgeService = service || (await import('./service/knowledge.service')).knowledgeService;
  
  const searchResults = await knowledgeService.searchKnowledges(searchQuery);
  const exports: Array<{
    knowledge: import('./model/knowledge.model').KnowledgeResponse;
    markdown: string;
  }> = [];

  for (const result of searchResults.results) {
    try {
      const markdown = await knowledgeService.exportKnowledgeToMarkdown(
        result.knowledge.id,
        exportOptions
      );
      
      exports.push({
        knowledge: result.knowledge,
        markdown
      });
    } catch (error) {
      console.error(`Failed to export knowledge ${result.knowledge.id}:`, error);
      // 继续处理其他 knowledge
    }
  }

  return exports;
}

/**
 * 知识图谱分析 - 获取知识之间的关联关系
 * 
 * @param knowledgeId 起始 knowledge ID
 * @param depth 分析深度，默认为 2 层
 * @param service 可选的服务实例
 * @returns Promise<KnowledgeGraph>
 */
export async function analyzeKnowledgeGraph(
  knowledgeId: string,
  depth: number = 2,
  service?: KnowledgeService
): Promise<{
  nodes: Array<{ id: string; title: string; tags: string[] }>;
  edges: Array<{ from: string; to: string; type: 'backlink' | 'forward_link' | 'tag_relation' }>;
}> {
  const knowledgeService = service || (await import('./service/knowledge.service')).knowledgeService;
  
  const nodes = new Map<string, { id: string; title: string; tags: string[] }>();
  const edges: Array<{ from: string; to: string; type: 'backlink' | 'forward_link' | 'tag_relation' }> = [];
  const visited = new Set<string>();
  
  async function analyzeNode(nodeId: string, currentDepth: number) {
    if (visited.has(nodeId) || currentDepth >= depth) return;
    
    visited.add(nodeId);
    
    try {
      const knowledge = await knowledgeService.getKnowledge(nodeId);
      nodes.set(nodeId, {
        id: knowledge.id,
        title: knowledge.title,
        tags: knowledge.tags
      });
      
      // 分析反向链接
      const backlinks = await knowledgeService.getKnowledgeBacklinks(nodeId);
      
      // 处理知识文档的反向链接
      for (const backlink of backlinks.knowledges) {
        edges.push({
          from: backlink.id,
          to: nodeId,
          type: 'backlink'
        });
        
        if (currentDepth < depth - 1) {
          await analyzeNode(backlink.id, currentDepth + 1);
        }
      }
      
      // 处理前向链接
      for (const linkedBlock of knowledge.linked_blocks) {
        // 这里可以扩展处理 block 到其他 knowledge 的关联
      }
      
    } catch (error) {
      console.error(`Failed to analyze knowledge ${nodeId}:`, error);
    }
  }
  
  await analyzeNode(knowledgeId, 0);
  
  return {
    nodes: Array.from(nodes.values()),
    edges
  };
}

/**
 * 获取模块版本信息
 */
export const KNOWLEDGE_MODULE_VERSION = '1.0.0';

/**
 * 获取模块功能概览
 */
export const KNOWLEDGE_MODULE_FEATURES = {
  dataModels: '完整的 TypeScript 数据模型',
  apiClient: 'HTTP 客户端封装，支持超时和错误处理',
  businessLogic: '业务逻辑服务，包含验证和批量操作',
  commandSystem: '命令系统集成，支持撤销/重做',
  utilities: '便利函数和高级分析工具'
} as const;

/**
 * 创建默认模块实例 - 延迟加载避免循环依赖
 */
function createDefaultModule() {
  return {
    // 核心服务
    get service() { return knowledgeService; },
    get api() { return knowledgeApi; },
    
    // 快速操作
    createQuickKnowledge,
    batchUpdateKnowledgeTags,
    searchAndExportKnowledges,
    analyzeKnowledgeGraph,
    
    // 初始化
    initialize: initializeKnowledgeModule,
    
    // 元信息
    version: KNOWLEDGE_MODULE_VERSION,
    features: KNOWLEDGE_MODULE_FEATURES
  };
}

/**
 * 默认导出 - 模块的主要功能
 */
export default createDefaultModule(); 