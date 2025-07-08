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

from schemas.resources.thought import (
    Thought,
    CreateThoughtRequest,
    UpdateThoughtRequest,
    UpgradeThoughtToKnowledgeRequest,
    ThoughtResponse,
    ThoughtListResponse,
    DeleteThoughtResponse,
    ThoughtSearchResponse,
    ThoughtSearchResultItem,
    UpgradeThoughtToKnowledgeResponse,
    PaginationInfo
)
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


def _thought_to_response(thought: Thought) -> ThoughtResponse:
    """将Thought模型转换为ThoughtResponse"""
    return ThoughtResponse(
        uuid=thought.uuid,
        summary=thought.summary,
        tags=thought.tags,
        root_block_id=thought.root_block_id,
        created_at=thought.created_at,
        updated_at=thought.updated_at
    )


async def list_thoughts(
    page: int = 1,
    limit: int = 20,
    tags: Optional[str] = None,
    search: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None
) -> ThoughtListResponse:
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
    
    # 转换为响应模型
    thought_responses = [_thought_to_response(thought) for thought in paginated_thoughts]
    pagination_info = PaginationInfo(
        page=page,
        limit=limit,
        total=total,
        total_pages=(total + limit - 1) // limit
    )
    
    return ThoughtListResponse(
        thoughts=thought_responses,
        pagination=pagination_info
    )


async def create_thought(thought_request: CreateThoughtRequest) -> ThoughtResponse:
    """创建新的思考笔记"""
    thought_id = str(uuid.uuid4())
    now = datetime.now()
    
    # 创建根 block
    from schemas.resources.block import CreateBlockRequest
    # 如果提供了summary，使用summary；否则使用默认内容
    summary = thought_request.summary or "Untitled Thought"
    content = f"# {summary}\n\n"
    
    root_block_request = CreateBlockRequest(
        content=content,
        parent_id=None
    )
    root_block = await blocks_service.create_block(root_block_request)
    
    thought = Thought(
        uuid=thought_id,
        summary=summary,
        tags=thought_request.tags,
        root_block_id=root_block.id,  # root_block现在是BlockResponse对象
        created_at=now,
        updated_at=now
    )
    
    save_thought(thought)
    return _thought_to_response(thought)


async def get_thought(thought_id: str) -> Optional[ThoughtResponse]:
    """获取思考笔记详情"""
    thought = load_thought(thought_id)
    if not thought:
        return None
    return _thought_to_response(thought)


async def update_thought(thought_id: str, update_request: UpdateThoughtRequest) -> Optional[ThoughtResponse]:
    """更新思考笔记"""
    thought = load_thought(thought_id)
    if not thought:
        return None
    
    # 更新字段（只更新非None的字段）
    update_data = update_request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(thought, field, value)
    
    thought.updated_at = datetime.now()
    save_thought(thought)
    return _thought_to_response(thought)


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
    knowledge_request: Optional[UpgradeThoughtToKnowledgeRequest] = None
) -> Optional[UpgradeThoughtToKnowledgeResponse]:
    """将思考笔记升级为知识文档"""
    thought = load_thought(thought_id)
    if not thought:
        return None
    
    # 导入 knowledges_service（避免循环导入）
    from . import knowledges_service
    from schemas.resources.knowledge import CreateKnowledgeRequest
    
    # 准备知识文档数据
    knowledge_request = knowledge_request or UpgradeThoughtToKnowledgeRequest()
    root_block = await blocks_service.get_block(thought.root_block_id)
    
    new_knowledge_request = CreateKnowledgeRequest(
        title=knowledge_request.title or thought.summary or "Untitled",
        description=knowledge_request.description or "Upgraded from thought",
        tags=knowledge_request.additional_tags or thought.tags,
        content=root_block.content if root_block else ""  # root_block现在是BlockResponse对象
    )
    
    # 创建知识文档
    knowledge = await knowledges_service.create_knowledge(new_knowledge_request)
    
    # 删除原思考笔记
    await delete_thought(thought_id)
    
    return UpgradeThoughtToKnowledgeResponse(
        success=True,
        knowledge=knowledge.model_dump(),
        message="Thought upgraded to knowledge successfully"
    )


async def search_thoughts(query: str) -> ThoughtSearchResponse:
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
            results.append(ThoughtSearchResultItem(
                thought=_thought_to_response(thought),
                score=score
            ))
    
    # 按匹配分数排序
    results.sort(key=lambda x: x.score, reverse=True)
    return ThoughtSearchResponse(results=results)
