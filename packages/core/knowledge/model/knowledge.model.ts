/**
 * Knowledge 数据模型和类型定义
 * 对应后端 Pydantic 模型
 */

export interface Knowledge {
  /** 唯一标识 */
  id: string;
  /** 知识标题 */
  title: string;
  /** 简介 */
  description: string;
  /** 标签列表 */
  tags: string[];
  /** 根块ID */
  root_block_id: string;
  /** 显式链接到其他 blocks */
  linked_blocks: string[];
  /** 被哪些其他内容引用 */
  backlinks: string[];
  /** 创建时间 */
  created_at: string;
  /** 更新时间 */
  updated_at: string;
}

// Request Models
export interface CreateKnowledgeRequest {
  /** 指定的知识ID，不提供则自动生成 */
  id?: string;
  /** 文档标题 */
  title: string;
  /** 文档描述 */
  description?: string;
  /** 标签列表 */
  tags?: string[];
  /** 初始内容 */
  content?: string;
  /** 显式链接到其他blocks */
  linked_blocks?: string[];
}

export interface UpdateKnowledgeMetadataRequest {
  /** 新标题 */
  title?: string;
  /** 新描述 */
  description?: string;
  /** 新标签列表 */
  tags?: string[];
  /** 新的链接blocks */
  linked_blocks?: string[];
}

export interface LinkBlockToKnowledgeRequest {
  /** 要链接的block ID */
  block_id: string;
  /** 插入位置，默认追加到末尾 */
  position?: number;
  /** 链接类型 */
  link_type?: string;
}

// Response Models
export interface KnowledgeResponse {
  /** 唯一标识 */
  id: string;
  /** 知识标题 */
  title: string;
  /** 简介 */
  description: string;
  /** 标签列表 */
  tags: string[];
  /** 根块ID */
  root_block_id: string;
  /** 显式链接到其他blocks */
  linked_blocks: string[];
  /** 被哪些其他内容引用 */
  backlinks: string[];
  /** 创建时间 */
  created_at: string;
  /** 更新时间 */
  updated_at: string;
}

export interface PaginationInfo {
  /** 当前页码 */
  page: number;
  /** 每页数量 */
  limit: number;
  /** 总记录数 */
  total: number;
  /** 总页数 */
  total_pages: number;
}

export interface KnowledgeListResponse {
  /** knowledge列表 */
  knowledges: KnowledgeResponse[];
  /** 分页信息 */
  pagination: PaginationInfo;
}

export interface BacklinkItem {
  /** 引用文档的ID */
  id: string;
  /** 引用文档的标题 */
  title: string;
  /** 创建时间 */
  created_at: string;
}

export interface KnowledgeBacklinksResponse {
  /** 引用的知识文档列表 */
  knowledges: BacklinkItem[];
  /** 引用的思考笔记列表 */
  thoughts: BacklinkItem[];
  /** 引用的任务列表 */
  todos: BacklinkItem[];
  /** 引用的blocks列表 */
  blocks: BacklinkItem[];
}

export interface LinkBlockToKnowledgeResponse {
  /** 操作是否成功 */
  success: boolean;
  /** 操作消息 */
  message: string;
  /** 已链接的block ID */
  linked_block_id: string;
  /** 更新后的knowledge信息 */
  knowledge: KnowledgeResponse;
}

export interface DeleteKnowledgeResponse {
  /** 操作是否成功 */
  success: boolean;
  /** 操作消息 */
  message: string;
}

export interface KnowledgeSearchResultItem {
  /** 匹配的knowledge */
  knowledge: KnowledgeResponse;
  /** 匹配分数 */
  score: number;
}

export interface KnowledgeSearchResponse {
  /** 搜索结果列表 */
  results: KnowledgeSearchResultItem[];
}

// API 查询参数
export interface ListKnowledgesParams {
  /** 页码 */
  page?: number;
  /** 每页数量 */
  limit?: number;
  /** 标签筛选，逗号分隔 */
  tags?: string;
  /** 搜索关键词 */
  search?: string;
}

export interface ExportKnowledgeParams {
  /** 是否包含元数据 */
  include_metadata?: boolean;
  /** 是否包含反向链接 */
  include_backlinks?: boolean;
}

// 错误响应
export interface ApiError {
  detail: string;
} 