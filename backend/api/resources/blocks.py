"""
Blocks API 模块

处理最小编辑单元(blocks)相关的所有API端点
blocks采用双向链表结构，支持层级组织和位置调整
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional

from service.resources import blocks_service
from schemas.resources.block import (
    CreateBlockRequest,
    UpdateBlockRequest,
    ReplaceBlockRequest,
    MoveBlockRequest,
    BlockResponse,
    BlockListResponse,
    BlockChildrenResponse,
    BlockSiblingsResponse,
    MoveBlockResponse,
    DeleteBlockResponse
)

router = APIRouter()


@router.get("/", response_model=BlockListResponse)
async def list_blocks(
    page: int = Query(1, ge=1, description="页码"),
    limit: int = Query(20, ge=1, le=100, description="每页数量"),
    parent_id: Optional[str] = Query(None, description="父块ID，用于筛选"),
    tags: Optional[str] = Query(None, description="标签筛选，逗号分隔")
):
    """
    列出所有blocks
    
    支持分页和筛选功能：
    - 分页：通过page和limit参数控制
    - 筛选：可按父块ID和标签筛选
    
    Returns:
        包含blocks列表和分页信息的响应
    """
    return await blocks_service.list_blocks(page, limit, parent_id, tags)


@router.post("/", response_model=BlockResponse)
async def create_block(block_request: CreateBlockRequest):
    """
    创建新的block
    
    Args:
        block_request: 创建block的请求数据
        
    Returns:
        创建的block信息，包括生成的ID和时间戳
    """
    return await blocks_service.create_block(block_request)


@router.get("/{block_id}", response_model=BlockResponse)
async def get_block(block_id: str):
    """
    获取单个block的详细信息
    
    Args:
        block_id: block的唯一标识符
        
    Returns:
        block的完整信息，包括内容、元数据和链接关系
        
    Raises:
        HTTPException: 当block不存在时返回404
    """
    block = await blocks_service.get_block(block_id)
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    return block


@router.patch("/{block_id}", response_model=BlockResponse)
async def update_block(block_id: str, update_request: UpdateBlockRequest):
    """
    部分更新block
    
    只更新提供的字段，其他字段保持不变
    
    Args:
        block_id: 要更新的block ID
        update_request: 包含要更新字段的请求数据
        
    Returns:
        更新后的block信息
        
    Raises:
        HTTPException: 当block不存在时返回404
    """
    block = await blocks_service.update_block(block_id, update_request)
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    return block


@router.put("/{block_id}", response_model=BlockResponse)
async def replace_block(block_id: str, replace_request: ReplaceBlockRequest):
    """
    完全替换block
    
    用新数据完全替换现有block的所有信息
    
    Args:
        block_id: 要替换的block ID
        replace_request: 新的block数据
        
    Returns:
        替换后的block信息
        
    Raises:
        HTTPException: 当block不存在时返回404
    """
    block = await blocks_service.replace_block(block_id, replace_request)
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    return block


@router.delete("/{block_id}", response_model=DeleteBlockResponse)
async def delete_block(block_id: str):
    """
    删除block
    
    删除指定的block，同时处理相关的链接关系：
    - 更新子blocks的父级关系
    - 调整兄弟blocks的链接关系
    
    Args:
        block_id: 要删除的block ID
        
    Returns:
        删除操作的确认信息
        
    Raises:
        HTTPException: 当block不存在时返回404
    """
    success = await blocks_service.delete_block(block_id)
    if not success:
        raise HTTPException(status_code=404, detail="Block not found")
    return DeleteBlockResponse(success=True, message="Block deleted successfully")


@router.get("/{block_id}/children", response_model=BlockChildrenResponse)
async def get_block_children(block_id: str):
    """
    获取指定block的所有子块
    
    返回以当前block为父级的所有直接子块列表
    
    Args:
        block_id: 父block的ID
        
    Returns:
        子blocks的列表，按照链表顺序排列
        
    Raises:
        HTTPException: 当父block不存在时返回404
    """
    # 先检查父block是否存在
    parent_block = await blocks_service.get_block(block_id)
    if not parent_block:
        raise HTTPException(status_code=404, detail="Parent block not found")
    
    return await blocks_service.get_block_children(block_id)


@router.get("/{block_id}/siblings", response_model=BlockSiblingsResponse)
async def get_block_siblings(block_id: str):
    """
    获取指定block的所有兄弟块
    
    返回与当前block同级的所有blocks（相同父级）
    
    Args:
        block_id: block的ID
        
    Returns:
        兄弟blocks的列表，按照链表顺序排列
        
    Raises:
        HTTPException: 当block不存在时返回404
    """
    # 先检查block是否存在
    block = await blocks_service.get_block(block_id)
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    
    return await blocks_service.get_block_siblings(block_id)


@router.post("/{block_id}/move", response_model=MoveBlockResponse)
async def move_block(
    block_id: str, 
    move_request: MoveBlockRequest
):
    """
    移动block位置
    
    通过修改parentId、prevId、nextId来重新组织block的结构关系
    
    Args:
        block_id: 要移动的block ID
        move_request: 包含新的位置信息的请求数据
                  
    Returns:
        移动操作的结果和更新后的block信息
        
    Raises:
        HTTPException: 当block不存在或移动操作无效时返回错误
    """
    result = await blocks_service.move_block(block_id, move_request)
    if not result:
        raise HTTPException(status_code=404, detail="Block not found or move operation failed")
    return result 