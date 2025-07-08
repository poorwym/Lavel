"""
Reviews API 模块

处理回顾与总结相关的所有API端点
支持LLM自动总结内容，帮助用户进行定期回顾和反思
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict, Any

from service.resources import reviews_service

router = APIRouter()


@router.get("/")
async def list_reviews(
    page: int = Query(1, ge=1, description="页码"),
    limit: int = Query(20, ge=1, le=100, description="每页数量"),
    tags: Optional[str] = Query(None, description="标签筛选，逗号分隔"),
    date_from: Optional[str] = Query(None, description="起始日期，格式：YYYY-MM-DD"),
    date_to: Optional[str] = Query(None, description="结束日期，格式：YYYY-MM-DD")
):
    """
    列出所有reviews
    
    支持多维度筛选和分页功能
    
    Args:
        page: 页码，从1开始
        limit: 每页返回的回顾数量
        tags: 标签筛选，多个标签用逗号分隔
        date_from: 起始日期筛选
        date_to: 结束日期筛选
        
    Returns:
        包含reviews列表和分页信息的响应
    """
    return await reviews_service.list_reviews(page, limit, tags, date_from, date_to)


@router.post("/")
async def create_review(review_data: Dict[str, Any]):
    """
    创建新的review
    
    创建一个回顾文档，可以是定期回顾或特定主题的总结
    
    Args:
        review_data: 包含回顾信息的字典
                    - title: 回顾标题（必需）
                    - tags: 标签列表（可选）
                    - template_id: 使用的模板ID（可选）
                    - auto_collect: 是否自动收集相关内容（默认true）
                    - scope: 回顾范围配置（可选）
                    
    Returns:
        创建的回顾信息，包括：
        - 回顾基本信息
        - 如果启用自动收集，返回收集到的相关内容
        - 建议的回顾要点
    """
    review = await reviews_service.create_review(review_data)
    return review.model_dump()


@router.get("/{review_id}")
async def get_review(review_id: str):
    """
    获取review的详细信息
    
    返回指定回顾的完整信息，包括所有相关内容和总结
    
    Args:
        review_id: 回顾的唯一标识符
        
    Returns:
        回顾的详细信息，包括：
        - 基本元数据（标题、类型、时间范围等）
        - 回顾内容和总结
        - 关联的思考、任务、知识等
        - 自动生成的洞察和建议
        
    Raises:
        HTTPException: 当回顾不存在时返回404
    """
    review = await reviews_service.get_review(review_id)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    return review.model_dump()


@router.patch("/{review_id}")
async def update_review_metadata(review_id: str, update_data: Dict[str, Any]):
    """
    更新review的元数据
    
    更新回顾的标题、标签等基本信息，不影响内容和总结
    
    Args:
        review_id: 要更新的回顾ID
        update_data: 包含要更新字段的字典
                    - title: 新标题（可选）
                    - tags: 新标签列表（可选）
                    - summary: 回顾摘要（可选）
                    
    Returns:
        更新后的回顾元数据
        
    Raises:
        HTTPException: 当回顾不存在时返回404
    """
    review = await reviews_service.update_review_metadata(review_id, update_data)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    return review.model_dump()


@router.delete("/{review_id}")
async def delete_review(review_id: str):
    """
    删除review
    
    删除指定的回顾文档，保留被引用的原始内容
    
    Args:
        review_id: 要删除的回顾ID
        
    Returns:
        删除操作的确认信息
        
    Raises:
        HTTPException: 当回顾不存在时返回404
    """
    success = await reviews_service.delete_review(review_id)
    if not success:
        raise HTTPException(status_code=404, detail="Review not found")
    return {"success": True, "message": "Review deleted successfully"}
