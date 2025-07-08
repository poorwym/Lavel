from datetime import datetime
from pydantic import Field
from typing import List, Optional, Literal
from .resource import LavelResource


class TaskNode(LavelResource):
    """子任务节点，支持 DAG 依赖关系"""
    
    content: str = Field(..., description="任务内容")
    status: Literal["pending", "done"] = Field(default="pending", description="任务状态")
    depends_on: List[str] = Field(default_factory=list, description="依赖的其他 TaskNode ID")


class Todo(LavelResource):
    """任务系统模型，支持子任务 DAG"""
    
    title: str = Field(..., description="任务标题")
    description: Optional[str] = Field(None, description="任务描述")
    status: Literal["pending", "in_progress", "done", "archived"] = Field(
        default="pending", 
        description="任务状态"
    )
    due_at: Optional[datetime] = Field(None, description="截止时间")
    subtasks: List[TaskNode] = Field(default_factory=list, description="DAG 结构的子任务")
    linked_knowledge: Optional[List[str]] = Field(
        default_factory=list, 
        description="关联的知识 UUID 列表"
    )
    dependencies: List[str] = Field(default_factory=list, description="依赖的其他任务ID列表")