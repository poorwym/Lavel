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

from schemas.resources.block import Block
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


async def list_blocks(
    page: int = 1,
    limit: int = 20,
    parent_id: Optional[str] = None,
    tags: Optional[str] = None
) -> Dict[str, Any]:
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
    
    return {
        "blocks": [block.model_dump() for block in paginated_blocks],
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": (total + limit - 1) // limit
        }
    }


async def create_block(block_data: Dict[str, Any]) -> Block:
    """创建新的 block"""
    block_id = str(uuid.uuid4())
    now = datetime.now()
    
    block = Block(
        id=block_id,
        content=block_data.get("content", ""),
        parent_id=block_data.get("parent_id"),
        prev_id=block_data.get("prev_id"),
        next_id=block_data.get("next_id"),
        first_child_id=block_data.get("first_child_id"),
        created_at=now,
        updated_at=now
    )
    
    save_block(block)
    return block


async def get_block(block_id: str) -> Optional[Block]:
    """获取单个 block"""
    return load_block(block_id)


async def update_block(block_id: str, update_data: Dict[str, Any]) -> Optional[Block]:
    """部分更新 block"""
    block = load_block(block_id)
    if not block:
        return None
    
    # 更新字段
    if "content" in update_data:
        block.content = update_data["content"]
    if "parent_id" in update_data:
        block.parent_id = update_data["parent_id"]
    if "prev_id" in update_data:
        block.prev_id = update_data["prev_id"]
    if "next_id" in update_data:
        block.next_id = update_data["next_id"]
    if "first_child_id" in update_data:
        block.first_child_id = update_data["first_child_id"]
    
    block.updated_at = datetime.now()
    save_block(block)
    return block


async def replace_block(block_id: str, block_data: Dict[str, Any]) -> Optional[Block]:
    """完全替换 block"""
    existing_block = load_block(block_id)
    if not existing_block:
        return None
    
    # 保留 ID 和创建时间
    block_data["id"] = block_id
    block_data["created_at"] = existing_block.created_at
    block_data["updated_at"] = datetime.now()
    
    new_block = Block(**block_data)
    save_block(new_block)
    return new_block


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
    children = await get_block_children(block_id)
    for child in children:
        child.parent_id = block.parent_id
        save_block(child)
    
    # 删除文件
    delete_block_file(block_id)
    return True


async def get_block_children(block_id: str) -> List[Block]:
    """获取 block 的所有子块"""
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


async def get_block_siblings(block_id: str) -> List[Block]:
    """获取 block 的所有兄弟块"""
    block = load_block(block_id)
    if not block:
        return []
    
    all_blocks = list_all_blocks()
    siblings = [b for b in all_blocks if b.parent_id == block.parent_id and b.id != block_id]
    return siblings


async def move_block(
    block_id: str, 
    move_data: Dict[str, Any]
) -> Optional[Dict[str, Any]]:
    """移动 block 位置"""
    block = load_block(block_id)
    if not block:
        return None
    
    # 先从当前位置移除
    await _remove_from_current_position(block)
    
    # 更新新位置信息
    new_parent_id = move_data.get("parent_id", block.parent_id)
    new_prev_id = move_data.get("prev_id")
    new_next_id = move_data.get("next_id")
    
    block.parent_id = new_parent_id
    block.prev_id = new_prev_id
    block.next_id = new_next_id
    
    # 插入到新位置
    await _insert_to_new_position(block)
    
    block.updated_at = datetime.now()
    save_block(block)
    
    return {
        "success": True,
        "block": block.model_dump(),
        "message": "Block moved successfully"
    }


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