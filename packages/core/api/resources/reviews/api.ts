/**
 * Reviews API 接口
 */

import { ApiClient, ApiResponse, defaultApiClient } from '../../client';
import {
  CreateReviewRequest,
  UpdateReviewMetadataRequest,
  ReviewResponse,
  ReviewListResponse,
  DeleteReviewResponse,
  ReviewListParams
} from './types';

export class ReviewsApi {
  private client: ApiClient;

  constructor(client: ApiClient = defaultApiClient) {
    this.client = client;
  }

  async listReviews(params?: ReviewListParams): Promise<ApiResponse<ReviewListResponse>> {
    return this.client.get<ReviewListResponse>('/reviews/', params);
  }

  async createReview(request: CreateReviewRequest): Promise<ApiResponse<ReviewResponse>> {
    return this.client.post<ReviewResponse>('/reviews/', request);
  }

  async getReview(reviewId: string): Promise<ApiResponse<ReviewResponse>> {
    return this.client.get<ReviewResponse>(`/reviews/${reviewId}`);
  }

  async updateReviewMetadata(reviewId: string, request: UpdateReviewMetadataRequest): Promise<ApiResponse<ReviewResponse>> {
    return this.client.patch<ReviewResponse>(`/reviews/${reviewId}`, request);
  }

  async deleteReview(reviewId: string): Promise<ApiResponse<DeleteReviewResponse>> {
    return this.client.delete<DeleteReviewResponse>(`/reviews/${reviewId}`);
  }
}

export const reviewsApi = new ReviewsApi(); 