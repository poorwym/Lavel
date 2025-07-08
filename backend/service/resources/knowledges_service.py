"""
Knowledges Service 模块

处理结构化知识文档相关的所有业务逻辑
支持类似Obsidian的链接机制和Markdown导出功能
"""

import json
import os
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from pathlib import Path

from schemas.resources.knowledge import Knowledge
from utils.config import Config
from . import blocks_service


def get_knowledges_dir() -> Path:
    """获取 knowledges 目录路径"""
    knowledges_dir = Config.lavel_dir / "knowledges"
    knowledges_dir.mkdir(parents=True, exist_ok=True)
    return knowledges_dir


def load_knowledge(knowledge_id: str) -> Optional[Knowledge]:
    """加载单个 knowledge"""
    knowledge_file = get_knowledges_dir() / f"{knowledge_id}.json"
    if not knowledge_file.exists():
        return None
    
    with open(knowledge_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return Knowledge(**data)


def save_knowledge(knowledge: Knowledge) -> None:
    """保存 knowledge 到文件"""
    knowledge_file = get_knowledges_dir() / f"{knowledge.uuid}.json"
    with open(knowledge_file, 'w', encoding='utf-8') as f:
        json.dump(knowledge.model_dump(mode='json'), f, ensure_ascii=False, indent=2)


def delete_knowledge_file(knowledge_id: str) -> None:
    """删除 knowledge 文件"""
    knowledge_file = get_knowledges_dir() / f"{knowledge_id}.json"
    if knowledge_file.exists():
        knowledge_file.unlink()


def list_all_knowledges() -> List[Knowledge]:
    """加载所有 knowledges"""
    knowledges_dir = get_knowledges_dir()
    knowledges = []
    
    for file_path in knowledges_dir.glob("*.json"):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            knowledges.append(Knowledge(**data))
        except Exception as e:
            print(f"Error loading knowledge from {file_path}: {e}")
    
    return knowledges


async def list_knowledges(
    page: int = 1,
    limit: int = 20,
    tags: Optional[str] = None,
    search: Optional[str] = None
) -> Dict[str, Any]:
    """列出知识文档，支持分页、标签筛选和搜索"""
    all_knowledges = list_all_knowledges()
    
    # 标签筛选
    if tags:
        tag_list = [tag.strip() for tag in tags.split(',')]
        all_knowledges = [
            k for k in all_knowledges 
            if any(tag in k.tags for tag in tag_list)
        ]
    
    # 搜索筛选
    if search:
        search_lower = search.lower()
        all_knowledges = [
            k for k in all_knowledges 
            if search_lower in k.title.lower() or search_lower in k.description.lower()
        ]
    
    # 按创建时间倒序排序
    all_knowledges.sort(key=lambda x: x.created_at, reverse=True)
    
    # 分页
    total = len(all_knowledges)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_knowledges = all_knowledges[start_idx:end_idx]
    
    return {
        "knowledges": [knowledge.model_dump() for knowledge in paginated_knowledges],
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": (total + limit - 1) // limit
        }
    }


async def create_knowledge(knowledge_data: Dict[str, Any]) -> Knowledge:
    """创建新的知识文档"""
    knowledge_id = str(uuid.uuid4())
    now = datetime.now()
    
    # 创建根 block
    root_block_data = {
        "content": knowledge_data.get("content", f"# {knowledge_data.get('title', 'Untitled')}\n\n"),
        "parent_id": None
    }
    root_block = await blocks_service.create_block(root_block_data)
    
    knowledge = Knowledge(
        uuid=knowledge_id,
        title=knowledge_data.get("title", "Untitled"),
        description=knowledge_data.get("description", ""),
        tags=knowledge_data.get("tags", []),
        root_block_id=root_block.id,
        created_at=now,
        updated_at=now,
        linked_blocks=knowledge_data.get("linked_blocks", []),
        backlinks=[]
    )
    
    save_knowledge(knowledge)
    return knowledge


async def get_knowledge(knowledge_id: str) -> Optional[Knowledge]:
    """获取知识文档详情"""
    return load_knowledge(knowledge_id)


async def update_knowledge_metadata(
    knowledge_id: str, 
    metadata: Dict[str, Any]
) -> Optional[Knowledge]:
    """更新知识文档的元数据"""
    knowledge = load_knowledge(knowledge_id)
    if not knowledge:
        return None
    
    # 更新字段
    if "title" in metadata:
        knowledge.title = metadata["title"]
    if "description" in metadata:
        knowledge.description = metadata["description"]
    if "tags" in metadata:
        knowledge.tags = metadata["tags"]
    if "linked_blocks" in metadata:
        knowledge.linked_blocks = metadata["linked_blocks"]
    
    knowledge.updated_at = datetime.now()
    save_knowledge(knowledge)
    return knowledge


async def delete_knowledge(knowledge_id: str) -> bool:
    """删除知识文档"""
    knowledge = load_knowledge(knowledge_id)
    if not knowledge:
        return False
    
    # 清理其他文档的反向链接
    await _remove_backlinks(knowledge_id)
    
    # 删除文件
    delete_knowledge_file(knowledge_id)
    return True


async def export_knowledge_to_markdown(
    knowledge_id: str,
    include_metadata: bool = True,
    include_backlinks: bool = False
) -> Optional[str]:
    """导出知识文档为Markdown格式"""
    knowledge = load_knowledge(knowledge_id)
    if not knowledge:
        return None
    
    markdown_content = []
    
    # 添加标题
    markdown_content.append(f"# {knowledge.title}\n")
    
    # 添加元数据
    if include_metadata:
        markdown_content.append("---")
        markdown_content.append(f"UUID: {knowledge.uuid}")
        markdown_content.append(f"Created: {knowledge.created_at.isoformat()}")
        markdown_content.append(f"Updated: {knowledge.updated_at.isoformat()}")
        if knowledge.tags:
            markdown_content.append(f"Tags: {', '.join(knowledge.tags)}")
        if knowledge.description:
            markdown_content.append(f"Description: {knowledge.description}")
        markdown_content.append("---\n")
    
    # 获取根 block 和所有相关 blocks 的内容
    root_block = await blocks_service.get_block(knowledge.root_block_id)
    if root_block:
        content = await _build_markdown_content(root_block)
        markdown_content.append(content)
    
    # 添加反向链接
    if include_backlinks and knowledge.backlinks:
        markdown_content.append("\n---\n")
        markdown_content.append("## Backlinks\n")
        for backlink_id in knowledge.backlinks:
            backlink_knowledge = load_knowledge(backlink_id)
            if backlink_knowledge:
                markdown_content.append(f"- [[{backlink_knowledge.title}]]")
    
    return "\n".join(markdown_content)


async def get_knowledge_backlinks(knowledge_id: str) -> Optional[Dict[str, List[Dict]]]:
    """获取知识文档的反向引用列表"""
    knowledge = load_knowledge(knowledge_id)
    if not knowledge:
        return None
    
    backlinks = {
        "knowledges": [],
        "thoughts": [],
        "todos": [],
        "blocks": []
    }
    
    # 查找引用当前知识的其他知识文档
    all_knowledges = list_all_knowledges()
    for k in all_knowledges:
        if k.uuid != knowledge_id and knowledge_id in (k.linked_blocks or []):
            backlinks["knowledges"].append({
                "uuid": k.uuid,
                "title": k.title,
                "created_at": k.created_at
            })
    
    return backlinks


async def link_block_to_knowledge(
    knowledge_id: str, 
    link_data: Dict[str, Any]
) -> Optional[Dict[str, Any]]:
    """将block链接到知识文档"""
    knowledge = load_knowledge(knowledge_id)
    if not knowledge:
        return None
    
    block_id = link_data.get("block_id")
    if not block_id:
        return None
    
    # 验证 block 是否存在
    block = await blocks_service.get_block(block_id)
    if not block:
        return None
    
    # 添加链接
    if not knowledge.linked_blocks:
        knowledge.linked_blocks = []
    
    if block_id not in knowledge.linked_blocks:
        position = link_data.get("position", len(knowledge.linked_blocks))
        knowledge.linked_blocks.insert(position, block_id)
        knowledge.updated_at = datetime.now()
        save_knowledge(knowledge)
    
    return {
        "success": True,
        "message": "Block linked successfully",
        "linked_block_id": block_id,
        "knowledge": knowledge.model_dump()
    }


async def _build_markdown_content(root_block) -> str:
    """递归构建 Markdown 内容"""
    content = [root_block.content]
    
    # 获取子 blocks
    children = await blocks_service.get_block_children(root_block.id)
    for child in children:
        child_content = await _build_markdown_content(child)
        content.append(child_content)
    
    return "\n".join(content)


async def _remove_backlinks(knowledge_id: str) -> None:
    """移除其他文档中指向当前知识的反向链接"""
    all_knowledges = list_all_knowledges()
    for knowledge in all_knowledges:
        if knowledge.backlinks and knowledge_id in knowledge.backlinks:
            knowledge.backlinks.remove(knowledge_id)
            save_knowledge(knowledge)


async def search_knowledges(query: str) -> List[Dict[str, Any]]:
    """搜索知识文档"""
    all_knowledges = list_all_knowledges()
    results = []
    
    query_lower = query.lower()
    for knowledge in all_knowledges:
        score = 0
        
        # 标题匹配
        if query_lower in knowledge.title.lower():
            score += 10
        
        # 描述匹配
        if query_lower in knowledge.description.lower():
            score += 5
        
        # 标签匹配
        for tag in knowledge.tags:
            if query_lower in tag.lower():
                score += 3
        
        if score > 0:
            results.append({
                "knowledge": knowledge.model_dump(),
                "score": score
            })
    
    # 按匹配分数排序
    results.sort(key=lambda x: x["score"], reverse=True)
    return results 