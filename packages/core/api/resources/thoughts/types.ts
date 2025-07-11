/**
 * Thoughts 资源类型定义
 */

export interface Thought {
  id: string;
  summary?: string;
  tags: string[];
  root_block_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateThoughtRequest {
  id?: string;
  summary?: string;
  tags?: string[];
}

export interface UpdateThoughtRequest {
  summary?: string;
  tags?: string[];
}

export interface UpgradeThoughtToKnowledgeRequest {
  title?: string;
  description?: string;
  additional_tags?: string[];
}

export interface ThoughtResponse {
  id: string;
  summary?: string;
  tags: string[];
  root_block_id: string;
  created_at: string;
  updated_at: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface ThoughtListResponse {
  thoughts: ThoughtResponse[];
  pagination: PaginationInfo;
}

export interface DeleteThoughtResponse {
  success: boolean;
  message: string;
}

export interface ThoughtSearchResultItem {
  thought: ThoughtResponse;
  score: number;
}

export interface ThoughtSearchResponse {
  results: ThoughtSearchResultItem[];
}

export interface UpgradeThoughtToKnowledgeResponse {
  success: boolean;
  knowledge: any;
  message: string;
}

export interface ThoughtListParams {
  page?: number;
  limit?: number;
  tags?: string;
  search?: string;
} 