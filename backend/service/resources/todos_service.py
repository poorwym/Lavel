"""
Todos Service 模块

处理任务系统相关的所有业务逻辑
支持LLM自动展开子任务，使用DAG结构管理任务依赖关系
"""

import json
import os
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from pathlib import Path

from schemas.resources.todo import (
    Todo, 
    TaskNode,
    CreateTodoRequest,
    UpdateTodoMetadataRequest,
    UpdateTodoStatusRequest,
    UpdateSubtaskStatusRequest,
    AddSubtaskRequest,
    TodoResponse,
    TaskNodeResponse,
    TodoWithStatsResponse,
    TodoListResponse,
    TodoSubtasksResponse,
    UpdateTodoStatusResponse,
    UpdateSubtaskStatusResponse,
    AddSubtaskResponse,
    DeleteTodoResponse,
    TodoSearchResponse,
    TodoSearchResultItem,
    SubtasksStatsResponse,
    SubtasksStatistics,
    DAGInfo,
    DAGNodeInfo,
    DAGEdgeInfo,
    PaginationInfo
)
from utils.config import Config
from . import blocks_service


def get_todos_dir() -> Path:
    """获取 todos 目录路径"""
    todos_dir = Config.lavel_dir / "todos"
    todos_dir.mkdir(parents=True, exist_ok=True)
    return todos_dir


def load_todo(todo_id: str) -> Optional[Todo]:
    """加载单个 todo"""
    todo_file = get_todos_dir() / f"{todo_id}.json"
    if not todo_file.exists():
        return None
    
    with open(todo_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return Todo(**data)


def save_todo(todo: Todo) -> None:
    """保存 todo 到文件"""
    todo_file = get_todos_dir() / f"{todo.id}.json"
    with open(todo_file, 'w', encoding='utf-8') as f:
        # 使用mode='json'来确保datetime被正确序列化
        json.dump(todo.model_dump(mode='json'), f, ensure_ascii=False, indent=2)


def delete_todo_file(todo_id: str) -> None:
    """删除 todo 文件"""
    todo_file = get_todos_dir() / f"{todo_id}.json"
    if todo_file.exists():
        todo_file.unlink()


def list_all_todos() -> List[Todo]:
    """加载所有 todos"""
    todos_dir = get_todos_dir()
    todos = []
    
    for file_path in todos_dir.glob("*.json"):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            todos.append(Todo(**data))
        except Exception as e:
            print(f"Error loading todo from {file_path}: {e}")
    
    return todos


def _tasknode_to_response(task: TaskNode) -> TaskNodeResponse:
    """将TaskNode模型转换为TaskNodeResponse"""
    return TaskNodeResponse(
        id=task.id,
        content=task.content,
        status=task.status,
        depends_on=task.depends_on,
        tags=task.tags,
        root_block_id=task.root_block_id,
        created_at=task.created_at,
        updated_at=task.updated_at
    )


def _todo_to_response(todo: Todo) -> TodoResponse:
    """将Todo模型转换为TodoResponse"""
    return TodoResponse(
        id=todo.id,
        title=todo.title,
        description=todo.description,
        status=todo.status,
        tags=todo.tags,
        root_block_id=todo.root_block_id,
        due_at=todo.due_at,
        subtasks=[_tasknode_to_response(subtask) for subtask in todo.subtasks],
        linked_knowledge=todo.linked_knowledge or [],
        dependencies=todo.dependencies,
        created_at=todo.created_at,
        updated_at=todo.updated_at
    )


def _todo_to_stats_response(todo: Todo) -> TodoWithStatsResponse:
    """将Todo模型转换为TodoWithStatsResponse（包含统计信息）"""
    subtasks_stats = SubtasksStatsResponse(
        total=len(todo.subtasks),
        completed=len([s for s in todo.subtasks if s.status == "done"]),
        pending=len([s for s in todo.subtasks if s.status == "pending"])
    )
    
    return TodoWithStatsResponse(
        id=todo.id,
        title=todo.title,
        description=todo.description,
        status=todo.status,
        tags=todo.tags,
        root_block_id=todo.root_block_id,
        due_at=todo.due_at,
        subtasks=[_tasknode_to_response(subtask) for subtask in todo.subtasks],
        linked_knowledge=todo.linked_knowledge or [],
        dependencies=todo.dependencies,
        created_at=todo.created_at,
        updated_at=todo.updated_at,
        subtasks_stats=subtasks_stats
    )


async def list_todos(
    page: int = 1,
    limit: int = 20,
    tags: Optional[str] = None,
    status: Optional[str] = None,
    due_before: Optional[str] = None
) -> TodoListResponse:
    """列出所有todo任务，支持多维度筛选和分页功能"""
    all_todos = list_all_todos()
    
    # 状态筛选
    if status:
        all_todos = [t for t in all_todos if t.status == status]
    
    # 标签筛选
    if tags:
        tag_list = [tag.strip() for tag in tags.split(',')]
        all_todos = [
            t for t in all_todos 
            if any(tag in t.tags for tag in tag_list)
        ]
    
    # 截止日期筛选
    if due_before:
        try:
            due_date = datetime.strptime(due_before, "%Y-%m-%d")
            all_todos = [
                t for t in all_todos 
                if t.due_at and t.due_at <= due_date
            ]
        except ValueError:
            pass
    
    # 按创建时间倒序排序
    all_todos.sort(key=lambda x: x.created_at, reverse=True)
    
    # 分页
    total = len(all_todos)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_todos = all_todos[start_idx:end_idx]
    
    # 转换为响应模型
    todo_responses = [_todo_to_stats_response(todo) for todo in paginated_todos]
    pagination_info = PaginationInfo(
        page=page,
        limit=limit,
        total=total,
        total_pages=(total + limit - 1) // limit
    )
    
    return TodoListResponse(
        todos=todo_responses,
        pagination=pagination_info
    )


async def create_todo(todo_request: CreateTodoRequest) -> TodoResponse:
    """创建新的todo任务"""
    todo_id = str(uuid.uuid4())
    now = datetime.now()
    
    # 创建根 block
    from schemas.resources.block import CreateBlockRequest
    content = f"# {todo_request.title}\n\n{todo_request.description or ''}"
    root_block_request = CreateBlockRequest(
        content=content,
        parent_id=None
    )
    root_block = await blocks_service.create_block(root_block_request)
    
    # 处理截止日期
    due_at = None
    if todo_request.due_date:
        try:
            due_at = datetime.strptime(todo_request.due_date, "%Y-%m-%d")
        except ValueError:
            pass
    
    todo = Todo(
        id=todo_id,
        title=todo_request.title,
        description=todo_request.description,
        tags=todo_request.tags,
        root_block_id=root_block.id,  # root_block现在是BlockResponse对象
        status="pending",
        created_at=now,
        due_at=due_at,
        subtasks=[],
        linked_knowledge=todo_request.linked_knowledge or []
    )
    
    # 如果启用自动展开子任务
    if todo_request.auto_expand:
        await _auto_expand_subtasks(todo, todo_request.expand_prompt)
    
    save_todo(todo)
    return _todo_to_response(todo)


async def get_todo(todo_id: str) -> Optional[TodoResponse]:
    """获取单个todo的详细信息"""
    todo = load_todo(todo_id)
    if not todo:
        return None
    return _todo_to_response(todo)


async def update_todo_metadata(todo_id: str, update_request: UpdateTodoMetadataRequest) -> Optional[TodoResponse]:
    """更新todo的元数据"""
    todo = load_todo(todo_id)
    if not todo:
        return None
    
    # 更新字段（只更新非None的字段）
    update_data = update_request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "due_date":
            # 特殊处理日期字段
            try:
                todo.due_at = datetime.strptime(value, "%Y-%m-%d")
            except (ValueError, TypeError):
                pass
        else:
            setattr(todo, field, value)
    
    save_todo(todo)
    return _todo_to_response(todo)


async def delete_todo(todo_id: str) -> bool:
    """删除todo任务"""
    todo = load_todo(todo_id)
    if not todo:
        return False
    
    # 删除关联的 block
    await blocks_service.delete_block(todo.root_block_id)
    
    # 删除文件
    delete_todo_file(todo_id)
    return True


async def get_todo_subtasks(todo_id: str) -> Optional[TodoSubtasksResponse]:
    """获取todo的所有子任务"""
    todo = load_todo(todo_id)
    if not todo:
        return None
    
    # 构建 DAG 信息
    dag_info = _build_dag_info(todo.subtasks)
    
    # 构建统计信息
    statistics = SubtasksStatistics(
        total=len(todo.subtasks),
        completed=len([s for s in todo.subtasks if s.status == "done"]),
        pending=len([s for s in todo.subtasks if s.status == "pending"]),
        completion_rate=len([s for s in todo.subtasks if s.status == "done"]) / len(todo.subtasks) if todo.subtasks else 0
    )
    
    return TodoSubtasksResponse(
        subtasks=[_tasknode_to_response(subtask) for subtask in todo.subtasks],
        dag_info=dag_info,
        statistics=statistics
    )


async def update_todo_status(
    todo_id: str, 
    status_request: UpdateTodoStatusRequest
) -> Optional[UpdateTodoStatusResponse]:
    """更新todo的状态"""
    todo = load_todo(todo_id)
    if not todo:
        return None
    
    old_status = todo.status
    todo.status = status_request.status
    
    # 如果标记为完成，自动设置完成时间
    if status_request.status == "done" and old_status != "done":
        # 可以在这里添加实际完成时间字段
        pass
    
    # 处理子任务状态的级联更新
    cascade_updates = []
    if status_request.status == "done":
        # 父任务完成时，标记所有未完成的子任务为完成
        for subtask in todo.subtasks:
            if subtask.status != "done":
                subtask.status = "done"
                cascade_updates.append(f"Subtask '{subtask.content}' marked as done")
    
    save_todo(todo)
    
    return UpdateTodoStatusResponse(
        success=True,
        updated_todo=_todo_to_response(todo),
        status_change=f"{old_status} -> {status_request.status}",
        cascade_updates=cascade_updates
    )


async def update_subtask_status(
    todo_id: str,
    subtask_id: str,
    status: str
) -> Optional[UpdateSubtaskStatusResponse]:
    """更新子任务状态"""
    todo = load_todo(todo_id)
    if not todo:
        return None
    
    # 找到子任务
    subtask = None
    for s in todo.subtasks:
        if s.id == subtask_id:
            subtask = s
            break
    
    if not subtask:
        return None
    
    old_status = subtask.status
    subtask.status = status
    
    # 检查是否需要更新父任务状态
    parent_status_update = None
    if status == "done":
        # 检查是否所有子任务都完成了
        all_done = all(s.status == "done" for s in todo.subtasks)
        if all_done and todo.status != "done":
            todo.status = "done"
            parent_status_update = "Parent todo marked as done"
    elif status == "pending" and todo.status == "done":
        # 如果有子任务未完成，父任务不能是完成状态
        todo.status = "in_progress"
        parent_status_update = "Parent todo marked as in_progress"
    
    save_todo(todo)
    
    return UpdateSubtaskStatusResponse(
        success=True,
        updated_subtask={
            "id": subtask.id,
            "content": subtask.content,
            "status": subtask.status,
            "status_change": f"{old_status} -> {status}"
        },
        subtask_update=f"Subtask '{subtask.content}': {old_status} -> {status}",
        parent_status_update=parent_status_update,
        todo=_todo_to_response(todo)
    )


async def add_subtask(
    todo_id: str,
    subtask_request: AddSubtaskRequest
) -> Optional[AddSubtaskResponse]:
    """添加新的子任务"""
    todo = load_todo(todo_id)
    if not todo:
        return None
    
    subtask_id = str(uuid.uuid4())
    
    # 从request中获取内容，优先使用content，然后是title
    content = subtask_request.content or subtask_request.title or ""
    
    new_subtask = TaskNode(
        id=subtask_id,
        content=content,
        status="pending",
        depends_on=subtask_request.depends_on or subtask_request.dependencies or [],
        tags=subtask_request.tags or [],
        root_block_id=subtask_request.root_block_id or str(uuid.uuid4()),
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    
    todo.subtasks.append(new_subtask)
    save_todo(todo)
    
    return AddSubtaskResponse(
        success=True,
        subtask=_tasknode_to_response(new_subtask),
        todo=_todo_to_response(todo)
    )


async def _auto_expand_subtasks(todo: Todo, expand_prompt: Optional[str] = None) -> None:
    """使用LLM自动展开子任务（占位符实现）"""
    # 这里应该调用 LLM 服务来自动生成子任务
    # 目前提供一个简单的实现
    
    default_subtasks = [
        f"分析 '{todo.title}' 的具体需求",
        f"制定 '{todo.title}' 的执行计划",
        f"执行 '{todo.title}' 的主要工作",
        f"检查和验证 '{todo.title}' 的完成情况"
    ]
    
    for i, content in enumerate(default_subtasks):
        subtask = TaskNode(
            id=str(uuid.uuid4()),
            content=content,
            status="pending",
            depends_on=[default_subtasks[i-1]] if i > 0 else [],
            tags=[],
            root_block_id=str(uuid.uuid4()),
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        todo.subtasks.append(subtask)


def _build_dag_info(subtasks: List[TaskNode]) -> DAGInfo:
    """构建 DAG 结构信息"""
    nodes = []
    edges = []
    
    for subtask in subtasks:
        nodes.append(DAGNodeInfo(
            id=subtask.id,
            label=subtask.content,
            status=subtask.status
        ))
        
        for dep_id in subtask.depends_on:
            edges.append(DAGEdgeInfo(
                from_node=dep_id,
                to=subtask.id
            ))
    
    return DAGInfo(
        nodes=nodes,
        edges=edges,
        has_cycles=_check_dag_cycles(subtasks)
    )


def _check_dag_cycles(subtasks: List[TaskNode]) -> bool:
    """检查 DAG 中是否有循环依赖"""
    # 简单的循环检测实现
    visited = set()
    rec_stack = set()
    
    def has_cycle(node_id: str) -> bool:
        visited.add(node_id)
        rec_stack.add(node_id)
        
        # 找到当前节点
        current_node = None
        for subtask in subtasks:
            if subtask.id == node_id:
                current_node = subtask
                break
        
        if current_node:
            for dep_id in current_node.depends_on:
                if dep_id not in visited:
                    if has_cycle(dep_id):
                        return True
                elif dep_id in rec_stack:
                    return True
        
        rec_stack.remove(node_id)
        return False
    
    for subtask in subtasks:
        if subtask.id not in visited:
            if has_cycle(subtask.id):
                return True
    
    return False


async def search_todos(query: str) -> TodoSearchResponse:
    """搜索任务"""
    all_todos = list_all_todos()
    results = []
    
    query_lower = query.lower()
    for todo in all_todos:
        score = 0
        
        # 标题匹配
        if query_lower in todo.title.lower():
            score += 10
        
        # 描述匹配
        if todo.description and query_lower in todo.description.lower():
            score += 5
        
        # 标签匹配
        for tag in todo.tags:
            if query_lower in tag.lower():
                score += 3
        
        # 子任务内容匹配
        for subtask in todo.subtasks:
            if query_lower in subtask.content.lower():
                score += 2
        
        if score > 0:
            results.append(TodoSearchResultItem(
                todo=_todo_to_response(todo),
                score=score
            ))
    
    # 按匹配分数排序
    results.sort(key=lambda x: x.score, reverse=True)
    return TodoSearchResponse(results=results) 