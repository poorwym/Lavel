from datetime import datetime
from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict, Any
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


# Request Models
class CreateTodoRequest(BaseModel):
    """创建todo的请求模型"""
    title: str = Field(..., description="任务标题")
    description: Optional[str] = Field(None, description="任务描述")
    due_date: Optional[str] = Field(None, description="截止日期，格式：YYYY-MM-DD")
    tags: Optional[List[str]] = Field(default_factory=list, description="标签列表")
    auto_expand: Optional[bool] = Field(True, description="是否使用LLM自动展开子任务")
    expand_prompt: Optional[str] = Field(None, description="自定义展开提示")
    linked_knowledge: Optional[List[str]] = Field(default_factory=list, description="关联的知识UUID列表")


class UpdateTodoMetadataRequest(BaseModel):
    """更新todo元数据的请求模型"""
    title: Optional[str] = Field(None, description="新标题")
    description: Optional[str] = Field(None, description="新描述")
    due_date: Optional[str] = Field(None, description="新截止日期，格式：YYYY-MM-DD")
    tags: Optional[List[str]] = Field(None, description="新标签列表")
    linked_knowledge: Optional[List[str]] = Field(None, description="关联的知识UUID列表")


class UpdateTodoStatusRequest(BaseModel):
    """更新todo状态的请求模型"""
    status: Literal["pending", "in_progress", "done", "archived"] = Field(..., description="新状态")
    completion_note: Optional[str] = Field(None, description="完成说明")
    actual_completion_date: Optional[str] = Field(None, description="实际完成日期")


class UpdateSubtaskStatusRequest(BaseModel):
    """更新子任务状态的请求模型"""
    status: Literal["pending", "done"] = Field(..., description="新状态")


class AddSubtaskRequest(BaseModel):
    """添加子任务的请求模型"""
    content: Optional[str] = Field(None, description="子任务内容")
    title: Optional[str] = Field(None, description="子任务标题")  # 兼容API文档
    description: Optional[str] = Field(None, description="子任务描述") 
    dependencies: Optional[List[str]] = Field(default_factory=list, description="依赖的其他子任务ID列表")
    depends_on: Optional[List[str]] = Field(default_factory=list, description="依赖的其他TaskNode ID")  # 兼容现有字段
    tags: Optional[List[str]] = Field(default_factory=list, description="标签列表")
    root_block_id: Optional[str] = Field(None, description="根块ID")


# Response Models
class TaskNodeResponse(BaseModel):
    """子任务节点的响应模型"""
    uuid: str = Field(..., description="唯一标识")
    content: str = Field(..., description="任务内容")
    status: Literal["pending", "done"] = Field(..., description="任务状态")
    depends_on: List[str] = Field(..., description="依赖的其他TaskNode ID")
    tags: List[str] = Field(..., description="标签列表")
    root_block_id: str = Field(..., description="根块ID")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")

    model_config = {
        "json_encoders": {datetime: lambda v: v.isoformat()}
    }


class TodoResponse(BaseModel):
    """单个todo的响应模型"""
    uuid: str = Field(..., description="唯一标识")
    title: str = Field(..., description="任务标题")
    description: Optional[str] = Field(None, description="任务描述")
    status: Literal["pending", "in_progress", "done", "archived"] = Field(..., description="任务状态")
    tags: List[str] = Field(..., description="标签列表")
    root_block_id: str = Field(..., description="根块ID")
    due_at: Optional[datetime] = Field(None, description="截止时间")
    subtasks: List[TaskNodeResponse] = Field(..., description="子任务列表")
    linked_knowledge: List[str] = Field(..., description="关联的知识UUID列表")
    dependencies: List[str] = Field(..., description="依赖的其他任务ID列表")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")

    model_config = {
        "json_encoders": {datetime: lambda v: v.isoformat()}
    }


class SubtasksStatsResponse(BaseModel):
    """子任务统计信息模型"""
    total: int = Field(..., description="总子任务数")
    completed: int = Field(..., description="已完成子任务数")
    pending: int = Field(..., description="待处理子任务数")


class TodoWithStatsResponse(BaseModel):
    """包含统计信息的todo响应模型"""
    uuid: str = Field(..., description="唯一标识")
    title: str = Field(..., description="任务标题")
    description: Optional[str] = Field(None, description="任务描述")
    status: Literal["pending", "in_progress", "done", "archived"] = Field(..., description="任务状态")
    tags: List[str] = Field(..., description="标签列表")
    root_block_id: str = Field(..., description="根块ID")
    due_at: Optional[datetime] = Field(None, description="截止时间")
    subtasks: List[TaskNodeResponse] = Field(..., description="子任务列表")
    linked_knowledge: List[str] = Field(..., description="关联的知识UUID列表")
    dependencies: List[str] = Field(..., description="依赖的其他任务ID列表")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")
    subtasks_stats: SubtasksStatsResponse = Field(..., description="子任务统计信息")

    model_config = {
        "json_encoders": {datetime: lambda v: v.isoformat()}
    }


class PaginationInfo(BaseModel):
    """分页信息模型"""
    page: int = Field(..., description="当前页码")
    limit: int = Field(..., description="每页数量")
    total: int = Field(..., description="总记录数")
    total_pages: int = Field(..., description="总页数")


class TodoListResponse(BaseModel):
    """todo列表的响应模型"""
    todos: List[TodoWithStatsResponse] = Field(..., description="todo列表")
    pagination: PaginationInfo = Field(..., description="分页信息")


class DAGNodeInfo(BaseModel):
    """DAG节点信息模型"""
    id: str = Field(..., description="节点ID")
    label: str = Field(..., description="节点标签")
    status: str = Field(..., description="节点状态")


class DAGEdgeInfo(BaseModel):
    """DAG边信息模型"""
    from_node: str = Field(..., description="源节点ID", alias="from")
    to: str = Field(..., description="目标节点ID")


class DAGInfo(BaseModel):
    """DAG结构信息模型"""
    nodes: List[DAGNodeInfo] = Field(..., description="节点列表")
    edges: List[DAGEdgeInfo] = Field(..., description="边列表")
    has_cycles: bool = Field(..., description="是否存在循环依赖")


class SubtasksStatistics(BaseModel):
    """子任务统计信息模型"""
    total: int = Field(..., description="总子任务数")
    completed: int = Field(..., description="已完成数")
    pending: int = Field(..., description="待处理数")
    completion_rate: float = Field(..., description="完成率")


class TodoSubtasksResponse(BaseModel):
    """todo子任务的响应模型"""
    subtasks: List[TaskNodeResponse] = Field(..., description="子任务列表")
    dag_info: DAGInfo = Field(..., description="DAG结构信息")
    statistics: SubtasksStatistics = Field(..., description="统计信息")


class UpdateTodoStatusResponse(BaseModel):
    """更新todo状态操作的响应模型"""
    success: bool = Field(..., description="操作是否成功")
    updated_todo: TodoResponse = Field(..., description="更新后的todo")
    status_change: str = Field(..., description="状态变化描述")
    cascade_updates: List[str] = Field(..., description="级联更新列表")


class UpdateSubtaskStatusResponse(BaseModel):
    """更新子任务状态操作的响应模型"""
    success: bool = Field(..., description="操作是否成功")
    updated_subtask: Dict[str, Any] = Field(..., description="更新后的子任务")
    subtask_update: str = Field(..., description="子任务更新描述")
    parent_status_update: Optional[str] = Field(None, description="父任务状态更新")
    todo: TodoResponse = Field(..., description="父任务信息")


class AddSubtaskResponse(BaseModel):
    """添加子任务操作的响应模型"""
    success: bool = Field(..., description="操作是否成功")
    subtask: TaskNodeResponse = Field(..., description="新添加的子任务")
    todo: TodoResponse = Field(..., description="父任务信息")


class DeleteTodoResponse(BaseModel):
    """删除todo操作的响应模型"""
    success: bool = Field(..., description="操作是否成功")
    message: str = Field(..., description="操作消息")


class TodoSearchResultItem(BaseModel):
    """todo搜索结果项模型"""
    todo: TodoResponse = Field(..., description="匹配的todo")
    score: int = Field(..., description="匹配分数")


class TodoSearchResponse(BaseModel):
    """todo搜索结果的响应模型"""
    results: List[TodoSearchResultItem] = Field(..., description="搜索结果列表")