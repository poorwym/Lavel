/**
 * Reviews 资源类型定义
 */

export interface Review {
  id: string;
  title: string;
  summary?: string;
  tags: string[];
  root_block_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateReviewRequest {
  id?: string;
  title: string;
  tags?: string[];
  template_id?: string;
  auto_collect?: boolean;
  scope?: any;
  summary?: string;
}

export interface UpdateReviewMetadataRequest {
  title?: string;
  tags?: string[];
  summary?: string;
}

export interface ReviewResponse {
  id: string;
  title: string;
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

export interface ReviewListResponse {
  reviews: ReviewResponse[];
  pagination: PaginationInfo;
}

export interface DeleteReviewResponse {
  success: boolean;
  message: string;
}

export interface ReviewListParams {
  page?: number;
  limit?: number;
  tags?: string;
  search?: string;
} 