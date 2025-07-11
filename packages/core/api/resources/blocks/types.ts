/**
 * @fileoverview Blocks 资源类型定义模块
 * 
 * 定义了与后端 Block 模型对应的 TypeScript 类型接口。Blocks 采用双向链表结构，
 * 支持复杂的层级关系和位置管理。
 * 
 * 核心概念：
 * - 每个 Block 都有唯一的 ID 标识
 * - 通过 parent_id 建立父子关系
 * - 通过 prev_id 和 next_id 建立兄弟关系的双向链表
 * - first_child_id 指向第一个子块，便于快速定位
 * 
 * @author Lavel Team
 * @since 1.0.0
 */

/**
 * Block 基础数据结构
 * 
 * 表示 Lavel 系统中的基本内容单元，采用双向链表结构存储。
 * 每个块都包含内容和位置关系信息。
 * 
 * @interface Block
 */
export interface Block {
  /** 块的唯一标识符 */
  id: string;
  
  /** 块的文本内容，支持 Markdown 格式 */
  content: string;
  
  /** 
   * 父块的 ID，为 null 时表示根级块
   * @optional
   */
  parent_id?: string;
  
  /** 
   * 前一个兄弟块的 ID，在同一父块下的兄弟关系中使用
   * @optional
   */
  prev_id?: string;
  
  /** 
   * 下一个兄弟块的 ID，在同一父块下的兄弟关系中使用
   * @optional
   */
  next_id?: string;
  
  /** 
   * 第一个子块的 ID，便于快速定位子块链表的开始
   * @optional
   */
  first_child_id?: string;
  
  /** 块的创建时间，ISO 8601 格式 */
  created_at: string;
  
  /** 块的最后更新时间，ISO 8601 格式 */
  updated_at: string;
}

/**
 * 创建 Block 的请求参数
 * 
 * 用于创建新块时提供的数据。ID 为可选，如果不提供会自动生成。
 * 可以指定块在双向链表中的初始位置。
 * 
 * @interface CreateBlockRequest
 */
export interface CreateBlockRequest {
  /** 
   * 指定块的 ID，可选。如果不提供，系统会自动生成唯一 ID
   * @optional
   */
  id?: string;
  
  /** 块的内容，必填字段 */
  content: string;
  
  /** 
   * 父块 ID，指定此块的父级位置
   * @optional
   */
  parent_id?: string;
  
  /** 
   * 前一个兄弟块 ID，用于在兄弟块间插入
   * @optional
   */
  prev_id?: string;
  
  /** 
   * 下一个兄弟块 ID，用于在兄弟块间插入
   * @optional
   */
  next_id?: string;
  
  /** 
   * 第一个子块 ID，通常在创建时不需要设置
   * @optional
   */
  first_child_id?: string;
}

/**
 * 更新 Block 的请求参数
 * 
 * 用于部分更新块的信息，所有字段都是可选的。
 * 未提供的字段将保持原值不变。
 * 
 * @interface UpdateBlockRequest
 */
export interface UpdateBlockRequest {
  /** 
   * 新的块内容
   * @optional
   */
  content?: string;
  
  /** 
   * 新的父块 ID，设置为 null 可将块移到根级
   * @optional
   */
  parent_id?: string;
  
  /** 
   * 新的前一个兄弟块 ID
   * @optional
   */
  prev_id?: string;
  
  /** 
   * 新的下一个兄弟块 ID
   * @optional
   */
  next_id?: string;
  
  /** 
   * 新的第一个子块 ID
   * @optional
   */
  first_child_id?: string;
}

/**
 * 替换 Block 的请求参数
 * 
 * 用于完全替换块的数据，content 是必填的，其他字段为可选。
 * 与 UpdateBlockRequest 不同，未提供的可选字段会被设置为 null。
 * 
 * @interface ReplaceBlockRequest
 */
export interface ReplaceBlockRequest {
  /** 新的块内容，必填 */
  content: string;
  
  /** 
   * 新的父块 ID
   * @optional
   */
  parent_id?: string;
  
  /** 
   * 新的前一个兄弟块 ID
   * @optional
   */
  prev_id?: string;
  
  /** 
   * 新的下一个兄弟块 ID
   * @optional
   */
  next_id?: string;
  
  /** 
   * 新的第一个子块 ID
   * @optional
   */
  first_child_id?: string;
}

/**
 * 移动 Block 的请求参数
 * 
 * 专门用于移动块位置的请求，只包含位置相关的字段。
 * 移动操作会自动维护双向链表的完整性。
 * 
 * @interface MoveBlockRequest
 */
export interface MoveBlockRequest {
  /** 
   * 目标父块 ID，设置为 null 可移动到根级
   * @optional
   */
  parent_id?: string;
  
  /** 
   * 目标位置的前一个兄弟块 ID
   * @optional
   */
  prev_id?: string;
  
  /** 
   * 目标位置的下一个兄弟块 ID
   * @optional
   */
  next_id?: string;
}

/**
 * Block API 响应数据
 * 
 * API 返回的块数据结构，与 Block 接口相同，
 * 但明确表示这是从服务器返回的数据。
 * 
 * @interface BlockResponse
 */
export interface BlockResponse {
  /** 块的唯一标识符 */
  id: string;
  
  /** 块的内容 */
  content: string;
  
  /** 父块 ID */
  parent_id?: string;
  
  /** 前一个兄弟块 ID */
  prev_id?: string;
  
  /** 下一个兄弟块 ID */
  next_id?: string;
  
  /** 第一个子块 ID */
  first_child_id?: string;
  
  /** 创建时间 */
  created_at: string;
  
  /** 更新时间 */
  updated_at: string;
}

/**
 * 分页信息
 * 
 * 包含分页查询的元数据信息，用于列表接口的响应。
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
 * Block 列表响应数据
 * 
 * 包含块列表和分页信息的响应结构。
 * 
 * @interface BlockListResponse
 */
export interface BlockListResponse {
  /** 块列表数据 */
  blocks: BlockResponse[];
  
  /** 分页信息 */
  pagination: PaginationInfo;
}

/**
 * 子块列表响应数据
 * 
 * 获取指定块的子块时返回的数据结构。
 * 
 * @interface BlockChildrenResponse
 */
export interface BlockChildrenResponse {
  /** 子块列表，按照链表顺序排列 */
  children: BlockResponse[];
}

/**
 * 兄弟块列表响应数据
 * 
 * 获取指定块的兄弟块时返回的数据结构。
 * 
 * @interface BlockSiblingsResponse
 */
export interface BlockSiblingsResponse {
  /** 兄弟块列表，按照链表顺序排列 */
  siblings: BlockResponse[];
}

/**
 * 移动 Block 操作响应数据
 * 
 * 移动块位置操作完成后返回的响应信息。
 * 
 * @interface MoveBlockResponse
 */
export interface MoveBlockResponse {
  /** 操作是否成功 */
  success: boolean;
  
  /** 移动后的块数据 */
  block: BlockResponse;
  
  /** 操作结果描述信息 */
  message: string;
}

/**
 * 删除 Block 操作响应数据
 * 
 * 删除块操作完成后返回的响应信息。
 * 
 * @interface DeleteBlockResponse
 */
export interface DeleteBlockResponse {
  /** 操作是否成功 */
  success: boolean;
  
  /** 操作结果描述信息 */
  message: string;
}

/**
 * Block 列表查询参数
 * 
 * 用于列表查询时的过滤和分页参数。
 * 
 * @interface BlockListParams
 */
export interface BlockListParams {
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
   * 按父块 ID 过滤，只返回指定父块的子块
   * @optional
   */
  parent_id?: string;
  
  /** 
   * 按标签过滤，多个标签用逗号分隔
   * @optional
   * @example "work,important" 或 "personal"
   */
  tags?: string;
}
