"""
Todos API 模块

处理任务系统相关的所有API端点
支持LLM自动展开子任务，使用DAG结构管理任务依赖关系
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from service.resources import todos_service
from schemas.resources.todo import (
    CreateTodoRequest,
    UpdateTodoMetadataRequest,
    UpdateTodoStatusRequest,
    UpdateSubtaskStatusRequest,
    AddSubtaskRequest,
    TodoResponse,
    TodoListResponse,
    TodoSubtasksResponse,
    UpdateTodoStatusResponse,
    UpdateSubtaskStatusResponse,
    AddSubtaskResponse,
    DeleteTodoResponse,
    TodoSearchResponse
)

router = APIRouter()


@router.get("/", response_model=TodoListResponse)
async def list_todos(
    page: int = Query(1, ge=1, description="页码"),
    limit: int = Query(20, ge=1, le=100, description="每页数量"),
    tags: Optional[str] = Query(None, description="标签筛选，逗号分隔"),
    status: Optional[str] = Query(None, description="状态筛选：pending,in_progress,completed,cancelled"),
    due_before: Optional[str] = Query(None, description="截止日期前筛选，格式：YYYY-MM-DD")
):
    """
    列出所有todo任务
    
    支持多维度筛选和分页功能
    
    Args:
        page: 页码，从1开始
        limit: 每页返回的任务数量
        tags: 标签筛选，多个标签用逗号分隔
        status: 任务状态筛选
        due_before: 筛选指定日期前到期的任务
        
    Returns:
        包含todos列表和分页信息的响应，每个todo包含子任务统计信息
    """
    return await todos_service.list_todos(page, limit, tags, status, due_before)


@router.post("/", response_model=TodoResponse)
async def create_todo(todo_request: CreateTodoRequest):
    """
    创建新的todo任务
    
    创建一级任务，支持LLM自动展开为细分子任务
    
    Args:
        todo_request: 创建任务的请求数据
                  
    Returns:
        创建的任务信息，包括：
        - 任务基本信息
        - 如果启用自动展开，返回生成的子任务列表
        - DAG结构信息
    """
    return await todos_service.create_todo(todo_request)


@router.get("/search", response_model=TodoSearchResponse)
async def search_todos(
    query: str = Query(..., description="搜索关键词")
):
    """
    搜索任务
    
    Args:
        query: 搜索关键词
        
    Returns:
        匹配的任务列表
    """
    return await todos_service.search_todos(query)


@router.get("/{todo_id}", response_model=TodoResponse)
async def get_todo(todo_id: str):
    """
    获取单个todo的详细信息
    
    返回指定任务的完整信息，包括所有子任务和DAG结构
    
    Args:
        todo_id: 任务的唯一标识符
        
    Returns:
        任务的详细信息，包括：
        - 基本元数据（标题、描述、状态等）
        - 子任务列表和依赖关系
        - 进度统计信息
        - 关联的知识文档
        
    Raises:
        HTTPException: 当任务不存在时返回404
    """
    todo = await todos_service.get_todo(todo_id)
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    return todo


@router.patch("/{todo_id}", response_model=TodoResponse)
async def update_todo_metadata(todo_id: str, update_request: UpdateTodoMetadataRequest):
    """
    更新todo的元数据
    
    更新任务的标题、描述等基本信息，不影响子任务结构
    
    Args:
        todo_id: 要更新的任务ID
        update_request: 包含要更新字段的请求数据
                    
    Returns:
        更新后的任务元数据
        
    Raises:
        HTTPException: 当任务不存在时返回404
    """
    todo = await todos_service.update_todo_metadata(todo_id, update_request)
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    return todo


@router.delete("/{todo_id}", response_model=DeleteTodoResponse)
async def delete_todo(todo_id: str):
    """
    删除todo任务
    
    删除指定的任务及其所有子任务
    
    Args:
        todo_id: 要删除的任务ID
        
    Returns:
        删除操作的确认信息，包括删除的子任务数量
        
    Raises:
        HTTPException: 当任务不存在时返回404
    """
    success = await todos_service.delete_todo(todo_id)
    if not success:
        raise HTTPException(status_code=404, detail="Todo not found")
    return DeleteTodoResponse(success=True, message="Todo deleted successfully")


@router.get("/{todo_id}/subtasks", response_model=TodoSubtasksResponse)
async def get_todo_subtasks(todo_id: str):
    """
    获取todo的所有子任务
    
    返回任务的完整子任务列表，包含DAG节点信息和依赖关系
    
    Args:
        todo_id: 父任务ID
        
    Returns:
        子任务列表，包括：
        - 每个子任务的详细信息
        - DAG节点关系（依赖、前置条件等）
        - 任务路径和层级信息
        - 完成状态统计
        
    Raises:
        HTTPException: 当父任务不存在时返回404
    """
    subtasks = await todos_service.get_todo_subtasks(todo_id)
    if subtasks is None:
        raise HTTPException(status_code=404, detail="Todo not found")
    return subtasks


@router.patch("/{todo_id}/status", response_model=UpdateTodoStatusResponse)
async def update_todo_status(
    todo_id: str, 
    status_request: UpdateTodoStatusRequest
):
    """
    更新todo的状态
    
    更新任务状态，自动处理相关的级联更新和进度计算
    
    Args:
        todo_id: 要更新状态的任务ID
        status_request: 状态更新请求数据
                    
    Returns:
        状态更新的结果，包括：
        - 更新后的任务信息
        - 影响的子任务状态变化
        - 父任务进度更新情况
        
    Raises:
        HTTPException: 当任务不存在或状态转换无效时返回错误
    """
    result = await todos_service.update_todo_status(todo_id, status_request)
    if not result:
        raise HTTPException(status_code=404, detail="Todo not found")
    return result


@router.patch("/{todo_id}/subtasks/{subtask_id}/status", response_model=UpdateSubtaskStatusResponse)
async def update_subtask_status(
    todo_id: str,
    subtask_id: str,
    status_request: UpdateSubtaskStatusRequest
):
    """
    更新子任务的状态
    
    Args:
        todo_id: 父任务ID
        subtask_id: 子任务ID
        status_request: 状态更新请求数据
        
    Returns:
        状态更新的结果
        
    Raises:
        HTTPException: 当任务或子任务不存在时返回404
    """
    result = await todos_service.update_subtask_status(todo_id, subtask_id, status_request.status)
    if not result:
        raise HTTPException(status_code=404, detail="Todo or subtask not found")
    return result


@router.post("/{todo_id}/subtasks", response_model=AddSubtaskResponse)
async def add_subtask(
    todo_id: str,
    subtask_request: AddSubtaskRequest
):
    """
    为任务添加子任务
    
    Args:
        todo_id: 父任务ID
        subtask_request: 子任务信息请求数据
                     
    Returns:
        添加的子任务信息
        
    Raises:
        HTTPException: 当父任务不存在时返回404
    """
    result = await todos_service.add_subtask(todo_id, subtask_request)
    if not result:
        raise HTTPException(status_code=404, detail="Todo not found")
    return result
