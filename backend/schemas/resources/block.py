from pydantic import BaseModel, Field
from typing import Optional
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
    