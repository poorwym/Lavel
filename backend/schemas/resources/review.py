from pydantic import Field
from typing import Optional
from .resource import LavelResource



class Review(LavelResource):
    """复盘 & 总结模块"""
    
    title: str = Field(..., description="复盘标题")
    summary: Optional[str] = Field(None, description="复盘摘要") 