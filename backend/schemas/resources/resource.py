from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class LavelResource(BaseModel):
    """基础模型"""
    
    id: str = Field(..., description="唯一标识")
    created_at: datetime = Field(default_factory=datetime.now, description="创建时间")
    updated_at: datetime = Field(default_factory=datetime.now, description="更新时间")
    tags: List[str] = Field(default_factory=list, description="标签列表")
    root_block_id: str = Field(None, description="根块 ID")

    model_config = {
        "json_encoders": {datetime: lambda v: v.isoformat()}
    }