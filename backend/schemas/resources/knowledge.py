from pydantic import Field
from typing import List, Optional
from .resource import LavelResource


class Knowledge(LavelResource):
    """结构化知识模型"""
    
    title: str = Field(..., description="知识标题")
    description: str = Field(..., description="简介")
    linked_blocks: Optional[List[str]] = Field(default_factory=list, description="显式链接到其他 blocks")
    backlinks: Optional[List[str]] = Field(default_factory=list, description="被哪些其他内容引用")