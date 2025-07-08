"""
Thoughts API 模块

处理轻量思维笔记相关的所有API端点
thoughts用于存放简短想法，支持升级为详细的knowledge文档
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict, Any
from datetime import date

from service.resources import thoughts_service

router = APIRouter()


@router.get("/")
async def list_thoughts(
    page: int = Query(1, ge=1, description="页码"),
    limit: int = Query(20, ge=1, le=100, description="每页数量"),
    tags: Optional[str] = Query(None, description="标签筛选，逗号分隔"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    date_from: Optional[str] = Query(None, description="起始日期，格式：YYYY-MM-DD"),
    date_to: Optional[str] = Query(None, description="结束日期，格式：YYYY-MM-DD")
):
    """
    列出所有thoughts
    
    支持分页、标签筛选、搜索和日期范围筛选
    
    Args:
        page: 页码，从1开始
        limit: 每页返回的思考笔记数量
        tags: 标签筛选，多个标签用逗号分隔
        search: 搜索关键词，支持内容搜索
        date_from: 起始日期筛选
        date_to: 结束日期筛选
        
    Returns:
        包含thoughts列表和分页信息的响应
    """
    return await thoughts_service.list_thoughts(page, limit, tags, search, date_from, date_to)


@router.post("/")
async def create_thought(thought_data: Dict[str, Any]):
    """
    创建新的thought
    
    创建一个轻量级的思考笔记，适合记录简短的想法和灵感
    
    Args:
        thought_data: 包含思考笔记信息的字典
                     - summary: 思考内容概述（可选，如果不提供会自动生成）
                     - tags: 标签列表（可选）
                     
    Returns:
        创建的思考笔记信息，包括生成的ID和时间戳
    """
    thought = await thoughts_service.create_thought(thought_data)
    return thought.model_dump()


@router.get("/search")
async def search_thoughts(
    query: str = Query(..., description="搜索关键词")
):
    """
    搜索思考笔记
    
    Args:
        query: 搜索关键词
        
    Returns:
        匹配的思考笔记列表
    """
    results = await thoughts_service.search_thoughts(query)
    return {"results": results}


@router.get("/{thought_id}")
async def get_thought(thought_id: str):
    """
    获取单个thought的详细信息
    
    返回指定思考笔记的完整信息
    
    Args:
        thought_id: 思考笔记的唯一标识符
        
    Returns:
        思考笔记的详细信息，包括：
        - 内容和标题
        - 标签和元数据
        - 创建和修改时间
        - 关联的其他资源
        
    Raises:
        HTTPException: 当思考笔记不存在时返回404
    """
    thought = await thoughts_service.get_thought(thought_id)
    if not thought:
        raise HTTPException(status_code=404, detail="Thought not found")
    return thought.model_dump()


@router.patch("/{thought_id}")
async def update_thought(thought_id: str, update_data: Dict[str, Any]):
    """
    更新thought
    
    部分更新思考笔记的内容或元数据
    
    Args:
        thought_id: 要更新的思考笔记ID
        update_data: 包含要更新字段的字典
                    - summary: 新概述（可选）
                    - tags: 新标签列表（可选）
                    
    Returns:
        更新后的思考笔记信息
        
    Raises:
        HTTPException: 当思考笔记不存在时返回404
    """
    thought = await thoughts_service.update_thought(thought_id, update_data)
    if not thought:
        raise HTTPException(status_code=404, detail="Thought not found")
    return thought.model_dump()


@router.delete("/{thought_id}")
async def delete_thought(thought_id: str):
    """
    删除thought
    
    删除指定的思考笔记
    
    Args:
        thought_id: 要删除的思考笔记ID
        
    Returns:
        删除操作的确认信息
        
    Raises:
        HTTPException: 当思考笔记不存在时返回404
    """
    success = await thoughts_service.delete_thought(thought_id)
    if not success:
        raise HTTPException(status_code=404, detail="Thought not found")
    return {"success": True, "message": "Thought deleted successfully"}


@router.post("/{thought_id}/upgrade")
async def upgrade_thought_to_knowledge(
    thought_id: str,
    knowledge_data: Optional[Dict[str, Any]] = None
):
    """
    将思考笔记升级为知识文档
    
    将轻量级的thought转换为结构化的knowledge文档
    
    Args:
        thought_id: 要升级的思考笔记ID
        knowledge_data: 知识文档的附加信息（可选）
                       - title: 自定义标题（可选）
                       - description: 描述（可选）
                       - additional_tags: 附加标签（可选）
                       
    Returns:
        升级操作的结果，包括：
        - 新创建的知识文档信息
        - 原思考笔记的处理状态
        
    Raises:
        HTTPException: 当思考笔记不存在时返回404
    """
    result = await thoughts_service.upgrade_thought_to_knowledge(thought_id, knowledge_data)
    if not result:
        raise HTTPException(status_code=404, detail="Thought not found")
    return result
