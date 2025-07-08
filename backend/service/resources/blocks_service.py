"""
Blocks Service 模块

处理最小编辑单元(blocks)相关的所有业务逻辑
支持双向链表结构和层级组织
"""

import json
import os
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any, Tuple
from pathlib import Path

from schemas.resources.block import (
    Block, 
    CreateBlockRequest, 
    UpdateBlockRequest, 
    ReplaceBlockRequest, 
    MoveBlockRequest,
    BlockResponse,
    BlockListResponse,
    BlockChildrenResponse,
    BlockSiblingsResponse,
    MoveBlockResponse,
    PaginationInfo
)
from utils.config import Config


def get_blocks_dir() -> Path:
    """获取 blocks 目录路径"""
    blocks_dir = Config.lavel_dir / "blocks"
    blocks_dir.mkdir(parents=True, exist_ok=True)
    return blocks_dir


def load_block(block_id: str) -> Optional[Block]:
    """加载单个 block"""
    block_file = get_blocks_dir() / f"{block_id}.json"
    if not block_file.exists():
        return None
    
    with open(block_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return Block(**data)


def save_block(block: Block) -> None:
    """保存 block 到文件"""
    block_file = get_blocks_dir() / f"{block.id}.json"
    with open(block_file, 'w', encoding='utf-8') as f:
        json.dump(block.model_dump(mode='json'), f, ensure_ascii=False, indent=2)


def delete_block_file(block_id: str) -> None:
    """删除 block 文件"""
    block_file = get_blocks_dir() / f"{block_id}.json"
    if block_file.exists():
        block_file.unlink()


def list_all_blocks() -> List[Block]:
    """加载所有 blocks"""
    blocks_dir = get_blocks_dir()
    blocks = []
    
    for file_path in blocks_dir.glob("*.json"):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            blocks.append(Block(**data))
        except Exception as e:
            print(f"Error loading block from {file_path}: {e}")
    
    return blocks


def _block_to_response(block: Block) -> BlockResponse:
    """将Block模型转换为BlockResponse"""
    return BlockResponse(
        id=block.id,
        content=block.content,
        parent_id=block.parent_id,
        prev_id=block.prev_id,
        next_id=block.next_id,
        first_child_id=block.first_child_id,
        created_at=block.created_at,
        updated_at=block.updated_at
    )


async def list_blocks(
    page: int = 1,
    limit: int = 20,
    parent_id: Optional[str] = None,
    tags: Optional[str] = None
) -> BlockListResponse:
    """列出 blocks，支持分页和筛选"""
    all_blocks = list_all_blocks()
    
    # 筛选
    filtered_blocks = all_blocks
    if parent_id is not None:
        filtered_blocks = [b for b in filtered_blocks if b.parent_id == parent_id]
    
    # 分页
    total = len(filtered_blocks)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_blocks = filtered_blocks[start_idx:end_idx]
    
    # 转换为响应模型
    block_responses = [_block_to_response(block) for block in paginated_blocks]
    pagination_info = PaginationInfo(
        page=page,
        limit=limit,
        total=total,
        total_pages=(total + limit - 1) // limit
    )
    
    return BlockListResponse(
        blocks=block_responses,
        pagination=pagination_info
    )


async def create_block(block_request: CreateBlockRequest) -> BlockResponse:
    """创建新的 block"""
    block_id = str(uuid.uuid4())
    now = datetime.now()
    
    block = Block(
        id=block_id,
        content=block_request.content,
        parent_id=block_request.parent_id,
        prev_id=block_request.prev_id,
        next_id=block_request.next_id,
        first_child_id=block_request.first_child_id,
        created_at=now,
        updated_at=now
    )
    
    save_block(block)
    return _block_to_response(block)


async def get_block(block_id: str) -> Optional[BlockResponse]:
    """获取单个 block"""
    block = load_block(block_id)
    if not block:
        return None
    return _block_to_response(block)


async def update_block(block_id: str, update_request: UpdateBlockRequest) -> Optional[BlockResponse]:
    """部分更新 block"""
    block = load_block(block_id)
    if not block:
        return None
    
    # 更新字段（只更新非None的字段）
    update_data = update_request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(block, field, value)
    
    block.updated_at = datetime.now()
    save_block(block)
    return _block_to_response(block)


async def replace_block(block_id: str, replace_request: ReplaceBlockRequest) -> Optional[BlockResponse]:
    """完全替换 block"""
    existing_block = load_block(block_id)
    if not existing_block:
        return None
    
    # 创建新的block，保留ID和创建时间
    new_block = Block(
        id=block_id,
        content=replace_request.content,
        parent_id=replace_request.parent_id,
        prev_id=replace_request.prev_id,
        next_id=replace_request.next_id,
        first_child_id=replace_request.first_child_id,
        created_at=existing_block.created_at,
        updated_at=datetime.now()
    )
    
    save_block(new_block)
    return _block_to_response(new_block)


async def delete_block(block_id: str) -> bool:
    """删除 block，处理链表关系"""
    block = load_block(block_id)
    if not block:
        return False
    
    # 更新父级的 first_child_id
    if block.parent_id:
        parent = load_block(block.parent_id)
        if parent and parent.first_child_id == block_id:
            parent.first_child_id = block.next_id
            save_block(parent)
    
    # 更新前后兄弟块的链接
    if block.prev_id:
        prev_block = load_block(block.prev_id)
        if prev_block:
            prev_block.next_id = block.next_id
            save_block(prev_block)
    
    if block.next_id:
        next_block = load_block(block.next_id)
        if next_block:
            next_block.prev_id = block.prev_id
            save_block(next_block)
    
    # 更新子块的父级为当前块的父级
    children = await get_block_children_internal(block_id)
    for child in children:
        child.parent_id = block.parent_id
        save_block(child)
    
    # 删除文件
    delete_block_file(block_id)
    return True


async def get_block_children_internal(block_id: str) -> List[Block]:
    """获取 block 的所有子块（内部使用，返回Block对象）"""
    all_blocks = list_all_blocks()
    children = [b for b in all_blocks if b.parent_id == block_id]
    
    # 按链表顺序排序
    if not children:
        return []
    
    # 找到第一个子块
    parent = load_block(block_id)
    if not parent or not parent.first_child_id:
        return children
    
    # 按链表顺序构建列表
    ordered_children = []
    current_id = parent.first_child_id
    
    while current_id:
        current_block = load_block(current_id)
        if not current_block:
            break
        ordered_children.append(current_block)
        current_id = current_block.next_id
    
    return ordered_children


async def get_block_children(block_id: str) -> BlockChildrenResponse:
    """获取 block 的所有子块"""
    children = await get_block_children_internal(block_id)
    children_responses = [_block_to_response(child) for child in children]
    return BlockChildrenResponse(children=children_responses)


async def get_block_siblings(block_id: str) -> BlockSiblingsResponse:
    """获取 block 的所有兄弟块"""
    block = load_block(block_id)
    if not block:
        return BlockSiblingsResponse(siblings=[])
    
    all_blocks = list_all_blocks()
    siblings = [b for b in all_blocks if b.parent_id == block.parent_id and b.id != block_id]
    siblings_responses = [_block_to_response(sibling) for sibling in siblings]
    return BlockSiblingsResponse(siblings=siblings_responses)


async def move_block(
    block_id: str, 
    move_request: MoveBlockRequest
) -> Optional[MoveBlockResponse]:
    """移动 block 位置"""
    block = load_block(block_id)
    if not block:
        return None
    
    # 先从当前位置移除
    await _remove_from_current_position(block)
    
    # 更新新位置信息
    block.parent_id = move_request.parent_id if move_request.parent_id is not None else block.parent_id
    block.prev_id = move_request.prev_id
    block.next_id = move_request.next_id
    
    # 插入到新位置
    await _insert_to_new_position(block)
    
    block.updated_at = datetime.now()
    save_block(block)
    
    return MoveBlockResponse(
        success=True,
        block=_block_to_response(block),
        message="Block moved successfully"
    )


async def _remove_from_current_position(block: Block) -> None:
    """从当前位置移除 block"""
    # 更新父级的 first_child_id
    if block.parent_id:
        parent = load_block(block.parent_id)
        if parent and parent.first_child_id == block.id:
            parent.first_child_id = block.next_id
            save_block(parent)
    
    # 更新前后兄弟块的链接
    if block.prev_id:
        prev_block = load_block(block.prev_id)
        if prev_block:
            prev_block.next_id = block.next_id
            save_block(prev_block)
    
    if block.next_id:
        next_block = load_block(block.next_id)
        if next_block:
            next_block.prev_id = block.prev_id
            save_block(next_block)


async def _insert_to_new_position(block: Block) -> None:
    """插入到新位置"""
    # 更新新父级的 first_child_id（如果插入为第一个子块）
    if block.parent_id and not block.prev_id:
        parent = load_block(block.parent_id)
        if parent:
            if parent.first_child_id:
                # 插入到现有第一个子块之前
                first_child = load_block(parent.first_child_id)
                if first_child:
                    first_child.prev_id = block.id
                    block.next_id = first_child.id
                    save_block(first_child)
            parent.first_child_id = block.id
            save_block(parent)
    
    # 更新前后兄弟块的链接
    if block.prev_id:
        prev_block = load_block(block.prev_id)
        if prev_block:
            prev_block.next_id = block.id
            save_block(prev_block)
    
    if block.next_id:
        next_block = load_block(block.next_id)
        if next_block:
            next_block.prev_id = block.id
            save_block(next_block) 