"""
Thoughts Service 模块

处理轻量思维笔记相关的所有业务逻辑
支持升级为详细的knowledge文档
"""

import json
import os
import uuid
from datetime import datetime, date
from typing import List, Optional, Dict, Any
from pathlib import Path

from schemas.resources.thought import Thought
from utils.config import Config
from . import blocks_service


def get_thoughts_dir() -> Path:
    """获取 thoughts 目录路径"""
    thoughts_dir = Config.lavel_dir / "thoughts"
    thoughts_dir.mkdir(parents=True, exist_ok=True)
    return thoughts_dir


def load_thought(thought_id: str) -> Optional[Thought]:
    """加载单个 thought"""
    thought_file = get_thoughts_dir() / f"{thought_id}.json"
    if not thought_file.exists():
        return None
    
    with open(thought_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return Thought(**data)


def save_thought(thought: Thought) -> None:
    """保存 thought 到文件"""
    thought_file = get_thoughts_dir() / f"{thought.uuid}.json"
    with open(thought_file, 'w', encoding='utf-8') as f:
        json.dump(thought.model_dump(mode='json'), f, ensure_ascii=False, indent=2)


def delete_thought_file(thought_id: str) -> None:
    """删除 thought 文件"""
    thought_file = get_thoughts_dir() / f"{thought_id}.json"
    if thought_file.exists():
        thought_file.unlink()


def list_all_thoughts() -> List[Thought]:
    """加载所有 thoughts"""
    thoughts_dir = get_thoughts_dir()
    thoughts = []
    
    for file_path in thoughts_dir.glob("*.json"):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            thoughts.append(Thought(**data))
        except Exception as e:
            print(f"Error loading thought from {file_path}: {e}")
    
    return thoughts


async def list_thoughts(
    page: int = 1,
    limit: int = 20,
    tags: Optional[str] = None,
    search: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None
) -> Dict[str, Any]:
    """列出思考笔记，支持分页、标签筛选、搜索和日期范围筛选"""
    all_thoughts = list_all_thoughts()
    
    # 标签筛选
    if tags:
        tag_list = [tag.strip() for tag in tags.split(',')]
        all_thoughts = [
            t for t in all_thoughts 
            if any(tag in t.tags for tag in tag_list)
        ]
    
    # 搜索筛选
    if search:
        search_lower = search.lower()
        all_thoughts = [
            t for t in all_thoughts 
            if (t.summary and search_lower in t.summary.lower())
        ]
    
    # 日期范围筛选
    if date_from:
        try:
            from_date = datetime.strptime(date_from, "%Y-%m-%d").date()
            all_thoughts = [
                t for t in all_thoughts 
                if t.created_at.date() >= from_date
            ]
        except ValueError:
            pass
    
    if date_to:
        try:
            to_date = datetime.strptime(date_to, "%Y-%m-%d").date()
            all_thoughts = [
                t for t in all_thoughts 
                if t.created_at.date() <= to_date
            ]
        except ValueError:
            pass
    
    # 按创建时间倒序排序
    all_thoughts.sort(key=lambda x: x.created_at, reverse=True)
    
    # 分页
    total = len(all_thoughts)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_thoughts = all_thoughts[start_idx:end_idx]
    
    return {
        "thoughts": [thought.model_dump() for thought in paginated_thoughts],
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": (total + limit - 1) // limit
        }
    }


async def create_thought(thought_data: Dict[str, Any]) -> Thought:
    """创建新的思考笔记"""
    thought_id = str(uuid.uuid4())
    now = datetime.now()
    
    # 创建根 block
    from schemas.resources.block import CreateBlockRequest
    # 如果提供了summary，使用summary；否则使用默认内容
    summary = thought_data.get("summary", "Untitled Thought")
    content = f"# {summary}\n\n"
    
    root_block_request = CreateBlockRequest(
        content=content,
        parent_id=None
    )
    root_block = await blocks_service.create_block(root_block_request)
    
    thought = Thought(
        uuid=thought_id,
        summary=summary,
        tags=thought_data.get("tags", []),
        root_block_id=root_block.id,  # root_block现在是BlockResponse对象
        created_at=now,
        updated_at=now
    )
    
    save_thought(thought)
    return thought


async def get_thought(thought_id: str) -> Optional[Thought]:
    """获取思考笔记详情"""
    return load_thought(thought_id)


async def update_thought(thought_id: str, update_data: Dict[str, Any]) -> Optional[Thought]:
    """更新思考笔记"""
    thought = load_thought(thought_id)
    if not thought:
        return None
    
    # 更新字段
    if "summary" in update_data:
        thought.summary = update_data["summary"]
    if "tags" in update_data:
        thought.tags = update_data["tags"]
    
    thought.updated_at = datetime.now()
    save_thought(thought)
    return thought


async def delete_thought(thought_id: str) -> bool:
    """删除思考笔记"""
    thought = load_thought(thought_id)
    if not thought:
        return False
    
    # 删除关联的 block
    await blocks_service.delete_block(thought.root_block_id)
    
    # 删除文件
    delete_thought_file(thought_id)
    return True


async def upgrade_thought_to_knowledge(
    thought_id: str, 
    knowledge_data: Optional[Dict[str, Any]] = None
) -> Optional[Dict[str, Any]]:
    """将思考笔记升级为知识文档"""
    thought = load_thought(thought_id)
    if not thought:
        return None
    
    # 导入 knowledges_service（避免循环导入）
    from . import knowledges_service
    
    # 准备知识文档数据
    knowledge_data = knowledge_data or {}
    root_block = await blocks_service.get_block(thought.root_block_id)
    
    new_knowledge_data = {
        "title": knowledge_data.get("title", thought.summary or "Untitled"),
        "description": knowledge_data.get("description", "Upgraded from thought"),
        "tags": knowledge_data.get("additional_tags", thought.tags),
        "content": root_block.content if root_block else ""  # root_block现在是BlockResponse对象
    }
    
    # 创建知识文档
    knowledge = await knowledges_service.create_knowledge(new_knowledge_data)
    
    # 删除原思考笔记
    await delete_thought(thought_id)
    
    return {
        "success": True,
        "knowledge": knowledge.model_dump(),
        "message": "Thought upgraded to knowledge successfully"
    }


async def search_thoughts(query: str) -> List[Dict[str, Any]]:
    """搜索思考笔记"""
    all_thoughts = list_all_thoughts()
    results = []
    
    query_lower = query.lower()
    for thought in all_thoughts:
        score = 0
        
        # 摘要匹配
        if thought.summary and query_lower in thought.summary.lower():
            score += 10
        
        # 标签匹配
        for tag in thought.tags:
            if query_lower in tag.lower():
                score += 5
        
        # 内容匹配（需要读取 block 内容）
        root_block = await blocks_service.get_block(thought.root_block_id)
        if root_block and query_lower in root_block.content.lower():  # root_block现在是BlockResponse对象
            score += 8
        
        if score > 0:
            results.append({
                "thought": thought.model_dump(),
                "score": score
            })
    
    # 按匹配分数排序
    results.sort(key=lambda x: x["score"], reverse=True)
    return results
