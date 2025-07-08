from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from .resource import LavelResource


class Thought(LavelResource):
    """快速想法/灵感模型"""
    
    summary: Optional[str] = Field(None, description="思维概括") 


# Request Models
class CreateThoughtRequest(BaseModel):
    """创建thought的请求模型"""
    summary: Optional[str] = Field(None, description="思考内容概述")
    tags: Optional[List[str]] = Field(default_factory=list, description="标签列表")


class UpdateThoughtRequest(BaseModel):
    """更新thought的请求模型"""
    summary: Optional[str] = Field(None, description="新概述")
    tags: Optional[List[str]] = Field(None, description="新标签列表")


class UpgradeThoughtToKnowledgeRequest(BaseModel):
    """将thought升级为knowledge的请求模型"""
    title: Optional[str] = Field(None, description="自定义标题")
    description: Optional[str] = Field(None, description="描述")
    additional_tags: Optional[List[str]] = Field(None, description="附加标签")


# Response Models
class ThoughtResponse(BaseModel):
    """单个thought的响应模型"""
    uuid: str = Field(..., description="唯一标识")
    summary: Optional[str] = Field(None, description="思维概括")
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


class ThoughtListResponse(BaseModel):
    """thought列表的响应模型"""
    thoughts: List[ThoughtResponse] = Field(..., description="thought列表")
    pagination: PaginationInfo = Field(..., description="分页信息")


class DeleteThoughtResponse(BaseModel):
    """删除thought操作的响应模型"""
    success: bool = Field(..., description="操作是否成功")
    message: str = Field(..., description="操作消息")


class ThoughtSearchResultItem(BaseModel):
    """thought搜索结果项模型"""
    thought: ThoughtResponse = Field(..., description="匹配的thought")
    score: int = Field(..., description="匹配分数")


class ThoughtSearchResponse(BaseModel):
    """thought搜索结果的响应模型"""
    results: List[ThoughtSearchResultItem] = Field(..., description="搜索结果列表")


class UpgradeThoughtToKnowledgeResponse(BaseModel):
    """升级thought为knowledge操作的响应模型"""
    success: bool = Field(..., description="操作是否成功")
    knowledge: Dict[str, Any] = Field(..., description="新创建的knowledge信息")
    message: str = Field(..., description="操作消息") 