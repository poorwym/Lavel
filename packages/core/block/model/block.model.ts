/**
 * Block 数据模型和类型定义
 * 对应后端 Pydantic 模型
 */

export interface Block {
  /** 唯一标识 */
  id: string;
  /** 文本内容 */
  content: string;
  /** 所属父块（可为 null） */
  parent_id?: string | null;
  /** 左兄弟块 ID */
  prev_id?: string | null;
  /** 右兄弟块 ID */
  next_id?: string | null;
  /** 第一个子块 ID（可选） */
  first_child_id?: string | null;
  /** 创建时间 */
  created_at: string;
  /** 更新时间 */
  updated_at: string;
}

// Request Models
export interface CreateBlockRequest {
  /** 指定的块ID，不提供则自动生成 */
  id?: string;
  /** 文本内容 */
  content: string;
  /** 所属父块ID */
  parent_id?: string | null;
  /** 左兄弟块ID */
  prev_id?: string | null;
  /** 右兄弟块ID */
  next_id?: string | null;
  /** 第一个子块ID */
  first_child_id?: string | null;
}

export interface UpdateBlockRequest {
  /** 文本内容 */
  content?: string;
  /** 所属父块ID */
  parent_id?: string | null;
  /** 左兄弟块ID */
  prev_id?: string | null;
  /** 右兄弟块ID */
  next_id?: string | null;
  /** 第一个子块ID */
  first_child_id?: string | null;
}

export interface ReplaceBlockRequest {
  /** 文本内容 */
  content: string;
  /** 所属父块ID */
  parent_id?: string | null;
  /** 左兄弟块ID */
  prev_id?: string | null;
  /** 右兄弟块ID */
  next_id?: string | null;
  /** 第一个子块ID */
  first_child_id?: string | null;
}

export interface MoveBlockRequest {
  /** 新的父块ID */
  parent_id?: string | null;
  /** 新的前一个兄弟块ID */
  prev_id?: string | null;
  /** 新的后一个兄弟块ID */
  next_id?: string | null;
}

// Response Models
export interface BlockResponse {
  /** 唯一标识 */
  id: string;
  /** 文本内容 */
  content: string;
  /** 所属父块ID */
  parent_id?: string | null;
  /** 左兄弟块ID */
  prev_id?: string | null;
  /** 右兄弟块ID */
  next_id?: string | null;
  /** 第一个子块ID */
  first_child_id?: string | null;
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

export interface BlockListResponse {
  /** block列表 */
  blocks: BlockResponse[];
  /** 分页信息 */
  pagination: PaginationInfo;
}

export interface BlockChildrenResponse {
  /** 子block列表 */
  children: BlockResponse[];
}

export interface BlockSiblingsResponse {
  /** 兄弟block列表 */
  siblings: BlockResponse[];
}

export interface MoveBlockResponse {
  /** 操作是否成功 */
  success: boolean;
  /** 移动后的block信息 */
  block: BlockResponse;
  /** 操作消息 */
  message: string;
}

export interface DeleteBlockResponse {
  /** 操作是否成功 */
  success: boolean;
  /** 操作消息 */
  message: string;
}

// API 查询参数
export interface ListBlocksParams {
  /** 页码 */
  page?: number;
  /** 每页数量 */
  limit?: number;
  /** 父块ID，用于筛选 */
  parent_id?: string;
  /** 标签筛选，逗号分隔 */
  tags?: string;
}

// 错误响应
export interface ApiError {
  detail: string;
} 