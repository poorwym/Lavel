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

from schemas.resources.todo import Todo, TaskNode
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
    todo_file = get_todos_dir() / f"{todo.uuid}.json"
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


async def list_todos(
    page: int = 1,
    limit: int = 20,
    tags: Optional[str] = None,
    status: Optional[str] = None,
    due_before: Optional[str] = None
) -> Dict[str, Any]:
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
    
    # 添加子任务统计信息
    result_todos = []
    for todo in paginated_todos:
        todo_dict = todo.model_dump()
        todo_dict["subtasks_stats"] = {
            "total": len(todo.subtasks),
            "completed": len([s for s in todo.subtasks if s.status == "done"]),
            "pending": len([s for s in todo.subtasks if s.status == "pending"])
        }
        result_todos.append(todo_dict)
    
    return {
        "todos": result_todos,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": (total + limit - 1) // limit
        }
    }


async def create_todo(todo_data: Dict[str, Any]) -> Todo:
    """创建新的todo任务"""
    todo_id = str(uuid.uuid4())
    now = datetime.now()
    
    # 创建根 block
    from schemas.resources.block import CreateBlockRequest
    content = f"# {todo_data.get('title', 'Untitled Task')}\n\n{todo_data.get('description', '')}"
    root_block_request = CreateBlockRequest(
        content=content,
        parent_id=None
    )
    root_block = await blocks_service.create_block(root_block_request)
    
    # 处理截止日期
    due_at = None
    if todo_data.get("due_date"):
        try:
            due_at = datetime.strptime(todo_data["due_date"], "%Y-%m-%d")
        except ValueError:
            pass
    
    todo = Todo(
        uuid=todo_id,
        title=todo_data.get("title", "Untitled Task"),
        description=todo_data.get("description"),
        tags=todo_data.get("tags", []),
        root_block_id=root_block.id,  # root_block现在是BlockResponse对象
        status="pending",
        created_at=now,
        due_at=due_at,
        subtasks=[],
        linked_knowledge=todo_data.get("linked_knowledge", [])
    )
    
    # 如果启用自动展开子任务
    if todo_data.get("auto_expand", True):
        await _auto_expand_subtasks(todo, todo_data.get("expand_prompt"))
    
    save_todo(todo)
    return todo


async def get_todo(todo_id: str) -> Optional[Todo]:
    """获取单个todo的详细信息"""
    return load_todo(todo_id)


async def update_todo_metadata(todo_id: str, update_data: Dict[str, Any]) -> Optional[Todo]:
    """更新todo的元数据"""
    todo = load_todo(todo_id)
    if not todo:
        return None
    
    # 更新字段
    if "title" in update_data:
        todo.title = update_data["title"]
    if "description" in update_data:
        todo.description = update_data["description"]
    if "tags" in update_data:
        todo.tags = update_data["tags"]
    if "due_date" in update_data:
        try:
            todo.due_at = datetime.strptime(update_data["due_date"], "%Y-%m-%d")
        except ValueError:
            pass
    if "linked_knowledge" in update_data:
        todo.linked_knowledge = update_data["linked_knowledge"]
    
    save_todo(todo)
    return todo


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


async def get_todo_subtasks(todo_id: str) -> Optional[Dict[str, Any]]:
    """获取todo的所有子任务"""
    todo = load_todo(todo_id)
    if not todo:
        return None
    
    # 构建 DAG 信息
    dag_info = _build_dag_info(todo.subtasks)
    
    return {
        "subtasks": [subtask.model_dump() for subtask in todo.subtasks],
        "dag_info": dag_info,
        "statistics": {
            "total": len(todo.subtasks),
            "completed": len([s for s in todo.subtasks if s.status == "done"]),
            "pending": len([s for s in todo.subtasks if s.status == "pending"]),
            "completion_rate": len([s for s in todo.subtasks if s.status == "done"]) / len(todo.subtasks) if todo.subtasks else 0
        }
    }


async def update_todo_status(
    todo_id: str, 
    status_data: Dict[str, Any]
) -> Optional[Dict[str, Any]]:
    """更新todo的状态"""
    todo = load_todo(todo_id)
    if not todo:
        return None
    
    new_status = status_data.get("status")
    if new_status not in ["pending", "in_progress", "done", "archived"]:
        return None
    
    old_status = todo.status
    todo.status = new_status
    
    # 如果标记为完成，自动设置完成时间
    if new_status == "done" and old_status != "done":
        # 可以在这里添加实际完成时间字段
        pass
    
    # 处理子任务状态的级联更新
    cascade_updates = []
    if new_status == "done":
        # 父任务完成时，标记所有未完成的子任务为完成
        for subtask in todo.subtasks:
            if subtask.status != "done":
                subtask.status = "done"
                cascade_updates.append(f"Subtask '{subtask.content}' marked as done")
    
    save_todo(todo)
    
    return {
        "success": True,
        "updated_todo": todo.model_dump(),
        "status_change": f"{old_status} -> {new_status}",
        "cascade_updates": cascade_updates
    }


async def update_subtask_status(
    todo_id: str,
    subtask_id: str,
    status: str
) -> Optional[Dict[str, Any]]:
    """更新子任务状态"""
    todo = load_todo(todo_id)
    if not todo:
        return None
    
    # 找到子任务
    subtask = None
    for s in todo.subtasks:
        if s.uuid == subtask_id:
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
    
    return {
        "success": True,
        "updated_subtask": {
            "id": subtask.uuid,
            "content": subtask.content,
            "status": subtask.status,
            "status_change": f"{old_status} -> {status}"
        },
        "subtask_update": f"Subtask '{subtask.content}': {old_status} -> {status}",
        "parent_status_update": parent_status_update,
        "todo": todo.model_dump()
    }


async def add_subtask(
    todo_id: str,
    subtask_data: Dict[str, Any]
) -> Optional[Dict[str, Any]]:
    """添加新的子任务"""
    todo = load_todo(todo_id)
    if not todo:
        return None
    
    subtask_id = str(uuid.uuid4())
    new_subtask = TaskNode(
        uuid=subtask_id,
        content=subtask_data.get("content", subtask_data.get("title", "")),
        status="pending",
        depends_on=subtask_data.get("depends_on", subtask_data.get("dependencies", [])),
        tags=subtask_data.get("tags", []),
        root_block_id=subtask_data.get("root_block_id", str(uuid.uuid4()))
    )
    
    todo.subtasks.append(new_subtask)
    save_todo(todo)
    
    return {
        "success": True,
        "subtask": new_subtask.model_dump(),
        "todo": todo.model_dump()
    }


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
            uuid=str(uuid.uuid4()),
            content=content,
            status="pending",
            depends_on=[default_subtasks[i-1]] if i > 0 else [],
            tags=[],
            root_block_id=str(uuid.uuid4())
        )
        todo.subtasks.append(subtask)


def _build_dag_info(subtasks: List[TaskNode]) -> Dict[str, Any]:
    """构建 DAG 结构信息"""
    nodes = []
    edges = []
    
    for subtask in subtasks:
        nodes.append({
            "id": subtask.uuid,
            "label": subtask.content,
            "status": subtask.status
        })
        
        for dep_id in subtask.depends_on:
            edges.append({
                "from": dep_id,
                "to": subtask.uuid
            })
    
    return {
        "nodes": nodes,
        "edges": edges,
        "has_cycles": _check_dag_cycles(subtasks)
    }


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
            if subtask.uuid == node_id:
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
        if subtask.uuid not in visited:
            if has_cycle(subtask.uuid):
                return True
    
    return False


async def search_todos(query: str) -> List[Dict[str, Any]]:
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
            results.append({
                "todo": todo.model_dump(),
                "score": score
            })
    
    # 按匹配分数排序
    results.sort(key=lambda x: x["score"], reverse=True)
    return results 