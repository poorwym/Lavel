from pydantic import Field
from typing import Optional
from .resource import LavelResource


class Thought(LavelResource):
    """快速想法/灵感模型"""
    
    summary: Optional[str] = Field(None, description="思维概括") 