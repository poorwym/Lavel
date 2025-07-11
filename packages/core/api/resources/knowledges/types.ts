/**
 * @fileoverview Knowledges 资源类型定义模块
 * 
 * 定义了与后端 Knowledge 模型对应的 TypeScript 类型接口。Knowledges 是 Lavel
 * 系统中的高级知识管理单元，基于 Block 系统构建，支持复杂的内容结构、
 * 标签管理、反向链接等功能。
 * 
 * 核心特性：
 * - 基于 Block 系统的内容存储
 * - 支持标签分类和管理
 * - 反向链接和关联关系
 * - 全文搜索和内容发现
 * 
 * @author Lavel Team
 * @since 1.0.0
 */

/**
 * Knowledge 基础数据结构
 * 
 * 表示 Lavel 系统中的知识文档，包含元数据和内容关联信息。
 * 每个知识文档都有一个根块用于存储主要内容。
 * 
 * @interface Knowledge
 */
export interface Knowledge {
  /** 知识文档的唯一标识符 */
  id: string;
  
  /** 知识文档的标题 */
  title: string;
  
  /** 知识文档的描述信息，用于概览和搜索 */
  description: string;
  
  /** 标签列表，用于分类和过滤 */
  tags: string[];
  
  /** 根块的 ID，指向存储主要内容的块 */
  root_block_id: string;
  
  /** 关联的块 ID 列表，包含所有相关内容块 */
  linked_blocks: string[];
  
  /** 反向链接列表，记录引用此知识文档的其他资源 */
  backlinks: string[];
  
  /** 创建时间，ISO 8601 格式 */
  created_at: string;
  
  /** 最后更新时间，ISO 8601 格式 */
  updated_at: string;
}

/**
 * 创建 Knowledge 的请求参数
 * 
 * 用于创建新知识文档时提供的数据。标题是必填的，其他字段可选。
 * 
 * @interface CreateKnowledgeRequest
 */
export interface CreateKnowledgeRequest {
  /** 
   * 指定知识文档的 ID，可选。如果不提供，系统会自动生成
   * @optional
   */
  id?: string;
  
  /** 知识文档的标题，必填 */
  title: string;
  
  /** 
   * 知识文档的描述信息
   * @optional
   */
  description?: string;
  
  /** 
   * 初始标签列表
   * @optional
   */
  tags?: string[];
  
  /** 
   * 初始内容，会自动创建根块
   * @optional
   */
  content?: string;
  
  /** 
   * 初始关联的块 ID 列表
   * @optional
   */
  linked_blocks?: string[];
}

/**
 * 更新 Knowledge 元数据的请求参数
 * 
 * 用于更新知识文档的元数据信息，所有字段都是可选的。
 * 
 * @interface UpdateKnowledgeMetadataRequest
 */
export interface UpdateKnowledgeMetadataRequest {
  /** 
   * 新的标题
   * @optional
   */
  title?: string;
  
  /** 
   * 新的描述信息
   * @optional
   */
  description?: string;
  
  /** 
   * 新的标签列表，会完全替换现有标签
   * @optional
   */
  tags?: string[];
  
  /** 
   * 新的关联块列表，会完全替换现有关联
   * @optional
   */
  linked_blocks?: string[];
}

/**
 * 将块链接到知识文档的请求参数
 * 
 * 用于将现有的块关联到知识文档中。
 * 
 * @interface LinkBlockToKnowledgeRequest
 */
export interface LinkBlockToKnowledgeRequest {
  /** 要链接的块 ID */
  block_id: string;
  
  /** 
   * 插入位置，指定在关联块列表中的位置
   * @optional
   */
  position?: number;
  
  /** 
   * 链接类型，用于区分不同的关联关系
   * @optional
   */
  link_type?: string;
}

/**
 * Knowledge API 响应数据
 * 
 * API 返回的知识文档数据结构，与 Knowledge 接口相同。
 * 
 * @interface KnowledgeResponse
 */
export interface KnowledgeResponse {
  /** 知识文档的唯一标识符 */
  id: string;
  
  /** 知识文档的标题 */
  title: string;
  
  /** 知识文档的描述信息 */
  description: string;
  
  /** 标签列表 */
  tags: string[];
  
  /** 根块的 ID */
  root_block_id: string;
  
  /** 关联的块 ID 列表 */
  linked_blocks: string[];
  
  /** 反向链接列表 */
  backlinks: string[];
  
  /** 创建时间 */
  created_at: string;
  
  /** 更新时间 */
  updated_at: string;
}

/**
 * 分页信息
 * 
 * 通用的分页数据结构。
 * 
 * @interface PaginationInfo
 */
export interface PaginationInfo {
  /** 当前页码，从 1 开始 */
  page: number;
  
  /** 每页的记录数 */
  limit: number;
  
  /** 总记录数 */
  total: number;
  
  /** 总页数 */
  total_pages: number;
}

/**
 * Knowledge 列表响应数据
 * 
 * 包含知识文档列表和分页信息的响应结构。
 * 
 * @interface KnowledgeListResponse
 */
export interface KnowledgeListResponse {
  /** 知识文档列表 */
  knowledges: KnowledgeResponse[];
  
  /** 分页信息 */
  pagination: PaginationInfo;
}

/**
 * 反向链接项信息
 * 
 * 表示一个反向链接的基本信息。
 * 
 * @interface BacklinkItem
 */
export interface BacklinkItem {
  /** 资源的 ID */
  id: string;
  
  /** 资源的标题或名称 */
  title: string;
  
  /** 创建时间 */
  created_at: string;
}

/**
 * Knowledge 反向链接响应数据
 * 
 * 包含所有类型资源的反向链接信息。
 * 
 * @interface KnowledgeBacklinksResponse
 */
export interface KnowledgeBacklinksResponse {
  /** 引用此知识文档的其他知识文档 */
  knowledges: BacklinkItem[];
  
  /** 引用此知识文档的思考笔记 */
  thoughts: BacklinkItem[];
  
  /** 引用此知识文档的任务 */
  todos: BacklinkItem[];
  
  /** 引用此知识文档的独立块 */
  blocks: BacklinkItem[];
}

/**
 * 链接块到知识文档的响应数据
 * 
 * 链接操作完成后返回的响应信息。
 * 
 * @interface LinkBlockToKnowledgeResponse
 */
export interface LinkBlockToKnowledgeResponse {
  /** 操作是否成功 */
  success: boolean;
  
  /** 操作结果描述信息 */
  message: string;
  
  /** 被链接的块 ID */
  linked_block_id: string;
  
  /** 更新后的知识文档信息 */
  knowledge: KnowledgeResponse;
}

/**
 * 删除 Knowledge 操作响应数据
 * 
 * 删除知识文档操作完成后返回的响应信息。
 * 
 * @interface DeleteKnowledgeResponse
 */
export interface DeleteKnowledgeResponse {
  /** 操作是否成功 */
  success: boolean;
  
  /** 操作结果描述信息 */
  message: string;
}

/**
 * 知识文档搜索结果项
 * 
 * 单个搜索结果的数据结构，包含相关度评分。
 * 
 * @interface KnowledgeSearchResultItem
 */
export interface KnowledgeSearchResultItem {
  /** 知识文档信息 */
  knowledge: KnowledgeResponse;
  
  /** 搜索相关度得分，范围 0.0-1.0 */
  score: number;
}

/**
 * Knowledge 搜索响应数据
 * 
 * 搜索操作返回的结果列表。
 * 
 * @interface KnowledgeSearchResponse
 */
export interface KnowledgeSearchResponse {
  /** 搜索结果列表，按相关度排序 */
  results: KnowledgeSearchResultItem[];
}

/**
 * Knowledge 列表查询参数
 * 
 * 用于列表查询时的过滤和分页参数。
 * 
 * @interface KnowledgeListParams
 */
export interface KnowledgeListParams {
  /** 
   * 页码，从 1 开始，默认为 1
   * @optional
   * @default 1
   */
  page?: number;
  
  /** 
   * 每页记录数，默认为 20
   * @optional
   * @default 20
   */
  limit?: number;
  
  /** 
   * 按标签过滤，多个标签用逗号分隔
   * @optional
   * @example "programming,typescript" 或 "learning"
   */
  tags?: string;
  
  /** 
   * 搜索关键词，在标题和描述中搜索
   * @optional
   */
  search?: string;
} 