from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class Block(BaseModel):
    """最小编辑单元，使用双向链表结构连接"""
    id: str = Field(..., description="唯一标识")
    content: str = Field(..., description="文本内容")
    parent_id: Optional[str] = Field(None, description="所属父块（可为 null）")
    prev_id: Optional[str] = Field(None, description="左兄弟块 ID")
    next_id: Optional[str] = Field(None, description="右兄弟块 ID")
    first_child_id: Optional[str] = Field(None, description="第一个子块 ID（可选）")
    created_at: datetime = Field(default_factory=datetime.now, description="创建时间")
    updated_at: datetime = Field(default_factory=datetime.now, description="更新时间")
    
    model_config = {
        "json_encoders": {datetime: lambda v: v.isoformat()}
    }


# Request Models
class CreateBlockRequest(BaseModel):
    """创建block的请求模型"""
    content: str = Field(..., description="文本内容")
    parent_id: Optional[str] = Field(None, description="所属父块ID")
    prev_id: Optional[str] = Field(None, description="左兄弟块ID")
    next_id: Optional[str] = Field(None, description="右兄弟块ID")
    first_child_id: Optional[str] = Field(None, description="第一个子块ID")


class UpdateBlockRequest(BaseModel):
    """更新block的请求模型"""
    content: Optional[str] = Field(None, description="文本内容")
    parent_id: Optional[str] = Field(None, description="所属父块ID")
    prev_id: Optional[str] = Field(None, description="左兄弟块ID")
    next_id: Optional[str] = Field(None, description="右兄弟块ID")
    first_child_id: Optional[str] = Field(None, description="第一个子块ID")


class ReplaceBlockRequest(BaseModel):
    """替换block的请求模型"""
    content: str = Field(..., description="文本内容")
    parent_id: Optional[str] = Field(None, description="所属父块ID")
    prev_id: Optional[str] = Field(None, description="左兄弟块ID")
    next_id: Optional[str] = Field(None, description="右兄弟块ID")
    first_child_id: Optional[str] = Field(None, description="第一个子块ID")


class MoveBlockRequest(BaseModel):
    """移动block的请求模型"""
    parent_id: Optional[str] = Field(None, description="新的父块ID")
    prev_id: Optional[str] = Field(None, description="新的前一个兄弟块ID")
    next_id: Optional[str] = Field(None, description="新的后一个兄弟块ID")


# Response Models
class BlockResponse(BaseModel):
    """单个block的响应模型"""
    id: str = Field(..., description="唯一标识")
    content: str = Field(..., description="文本内容")
    parent_id: Optional[str] = Field(None, description="所属父块ID")
    prev_id: Optional[str] = Field(None, description="左兄弟块ID")
    next_id: Optional[str] = Field(None, description="右兄弟块ID")
    first_child_id: Optional[str] = Field(None, description="第一个子块ID")
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


class BlockListResponse(BaseModel):
    """block列表的响应模型"""
    blocks: List[BlockResponse] = Field(..., description="block列表")
    pagination: PaginationInfo = Field(..., description="分页信息")


class BlockChildrenResponse(BaseModel):
    """子block列表的响应模型"""
    children: List[BlockResponse] = Field(..., description="子block列表")


class BlockSiblingsResponse(BaseModel):
    """兄弟block列表的响应模型"""
    siblings: List[BlockResponse] = Field(..., description="兄弟block列表")


class MoveBlockResponse(BaseModel):
    """移动block操作的响应模型"""
    success: bool = Field(..., description="操作是否成功")
    block: BlockResponse = Field(..., description="移动后的block信息")
    message: str = Field(..., description="操作消息")


class DeleteBlockResponse(BaseModel):
    """删除block操作的响应模型"""
    success: bool = Field(..., description="操作是否成功")
    message: str = Field(..., description="操作消息")
    