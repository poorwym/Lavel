from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from .resource import LavelResource


class Knowledge(LavelResource):
    """结构化知识模型"""
    
    title: str = Field(..., description="知识标题")
    description: str = Field(..., description="简介")
    linked_blocks: Optional[List[str]] = Field(default_factory=list, description="显式链接到其他 blocks")
    backlinks: Optional[List[str]] = Field(default_factory=list, description="被哪些其他内容引用")


# Request Models
class CreateKnowledgeRequest(BaseModel):
    """创建knowledge的请求模型"""
    title: str = Field(..., description="文档标题")
    description: Optional[str] = Field("", description="文档描述")
    tags: Optional[List[str]] = Field(default_factory=list, description="标签列表")
    content: Optional[str] = Field(None, description="初始内容")
    linked_blocks: Optional[List[str]] = Field(default_factory=list, description="显式链接到其他blocks")


class UpdateKnowledgeMetadataRequest(BaseModel):
    """更新knowledge元数据的请求模型"""
    title: Optional[str] = Field(None, description="新标题")
    description: Optional[str] = Field(None, description="新描述")
    tags: Optional[List[str]] = Field(None, description="新标签列表")
    linked_blocks: Optional[List[str]] = Field(None, description="新的链接blocks")


class LinkBlockToKnowledgeRequest(BaseModel):
    """将block链接到knowledge的请求模型"""
    block_id: str = Field(..., description="要链接的block ID")
    position: Optional[int] = Field(None, description="插入位置，默认追加到末尾")
    link_type: Optional[str] = Field("reference", description="链接类型")


# Response Models
class KnowledgeResponse(BaseModel):
    """单个knowledge的响应模型"""
    id: str = Field(..., description="唯一标识")
    title: str = Field(..., description="知识标题")
    description: str = Field(..., description="简介")
    tags: List[str] = Field(..., description="标签列表")
    root_block_id: str = Field(..., description="根块ID")
    linked_blocks: List[str] = Field(..., description="显式链接到其他blocks")
    backlinks: List[str] = Field(..., description="被哪些其他内容引用")
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


class KnowledgeListResponse(BaseModel):
    """knowledge列表的响应模型"""
    knowledges: List[KnowledgeResponse] = Field(..., description="knowledge列表")
    pagination: PaginationInfo = Field(..., description="分页信息")


class BacklinkItem(BaseModel):
    """反向链接项模型"""
    id: str = Field(..., description="引用文档的ID")
    title: str = Field(..., description="引用文档的标题")
    created_at: datetime = Field(..., description="创建时间")

    model_config = {
        "json_encoders": {datetime: lambda v: v.isoformat()}
    }


class KnowledgeBacklinksResponse(BaseModel):
    """knowledge反向链接的响应模型"""
    knowledges: List[BacklinkItem] = Field(..., description="引用的知识文档列表")
    thoughts: List[BacklinkItem] = Field(..., description="引用的思考笔记列表")  
    todos: List[BacklinkItem] = Field(..., description="引用的任务列表")
    blocks: List[BacklinkItem] = Field(..., description="引用的blocks列表")


class LinkBlockToKnowledgeResponse(BaseModel):
    """链接block到knowledge操作的响应模型"""
    success: bool = Field(..., description="操作是否成功")
    message: str = Field(..., description="操作消息")
    linked_block_id: str = Field(..., description="已链接的block ID")
    knowledge: KnowledgeResponse = Field(..., description="更新后的knowledge信息")


class DeleteKnowledgeResponse(BaseModel):
    """删除knowledge操作的响应模型"""
    success: bool = Field(..., description="操作是否成功")
    message: str = Field(..., description="操作消息")


class KnowledgeSearchResultItem(BaseModel):
    """knowledge搜索结果项模型"""
    knowledge: KnowledgeResponse = Field(..., description="匹配的knowledge")
    score: int = Field(..., description="匹配分数")


class KnowledgeSearchResponse(BaseModel):
    """knowledge搜索结果的响应模型"""
    results: List[KnowledgeSearchResultItem] = Field(..., description="搜索结果列表")