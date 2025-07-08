from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from .resource import LavelResource


class Review(LavelResource):
    """复盘 & 总结模块"""
    
    title: str = Field(..., description="复盘标题")
    summary: Optional[str] = Field(None, description="复盘摘要") 


# Request Models
class CreateReviewRequest(BaseModel):
    """创建review的请求模型"""
    title: str = Field(..., description="回顾标题")
    tags: Optional[List[str]] = Field(default_factory=list, description="标签列表")
    template_id: Optional[str] = Field(None, description="使用的模板ID")
    auto_collect: Optional[bool] = Field(True, description="是否自动收集相关内容")
    scope: Optional[Dict[str, Any]] = Field(None, description="回顾范围配置")
    summary: Optional[str] = Field(None, description="回顾摘要")


class UpdateReviewMetadataRequest(BaseModel):
    """更新review元数据的请求模型"""
    title: Optional[str] = Field(None, description="新标题")
    tags: Optional[List[str]] = Field(None, description="新标签列表")
    summary: Optional[str] = Field(None, description="回顾摘要")


# Response Models
class ReviewResponse(BaseModel):
    """单个review的响应模型"""
    id: str = Field(..., description="唯一标识")
    title: str = Field(..., description="复盘标题")
    summary: Optional[str] = Field(None, description="复盘摘要")
    tags: List[str] = Field(..., description="标签列表")
    root_block_id: str = Field(..., description="根块ID")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")

    model_config = {
        "json_encoders": {datetime: lambda v: v.isoformat()}
    }


class PaginationInfo(BaseModel):
    """分页信息模型"""
    page: int = Field(..., description="当前页码")
    limit: int = Field(..., description="每页数量")
    total: int = Field(..., description="总记录数")
    total_pages: int = Field(..., description="总页数")


class ReviewListResponse(BaseModel):
    """review列表的响应模型"""
    reviews: List[ReviewResponse] = Field(..., description="review列表")
    pagination: PaginationInfo = Field(..., description="分页信息")


class DeleteReviewResponse(BaseModel):
    """删除review操作的响应模型"""
    success: bool = Field(..., description="操作是否成功")
    message: str = Field(..., description="操作消息") 