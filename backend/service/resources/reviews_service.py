"""
Reviews Service 模块

处理回顾与总结相关的所有业务逻辑
支持LLM自动总结内容，帮助用户进行定期回顾和反思
"""

import json
import os
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from pathlib import Path

from schemas.resources.review import Review
from utils.config import Config
from . import blocks_service


def get_reviews_dir() -> Path:
    """获取 reviews 目录路径"""
    reviews_dir = Config.lavel_dir / "reviews"
    reviews_dir.mkdir(parents=True, exist_ok=True)
    return reviews_dir


def load_review(review_id: str) -> Optional[Review]:
    """加载单个 review"""
    review_file = get_reviews_dir() / f"{review_id}.json"
    if not review_file.exists():
        return None
    
    with open(review_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return Review(**data)


def save_review(review: Review) -> None:
    """保存 review 到文件"""
    review_file = get_reviews_dir() / f"{review.uuid}.json"
    with open(review_file, 'w', encoding='utf-8') as f:
        json.dump(review.model_dump(mode='json'), f, ensure_ascii=False, indent=2)


def delete_review_file(review_id: str) -> None:
    """删除 review 文件"""
    review_file = get_reviews_dir() / f"{review_id}.json"
    if review_file.exists():
        review_file.unlink()


def list_all_reviews() -> List[Review]:
    """加载所有 reviews"""
    reviews_dir = get_reviews_dir()
    reviews = []
    
    for file_path in reviews_dir.glob("*.json"):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            reviews.append(Review(**data))
        except Exception as e:
            print(f"Error loading review from {file_path}: {e}")
    
    return reviews


async def list_reviews(
    page: int = 1,
    limit: int = 20,
    tags: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None
) -> Dict[str, Any]:
    """列出所有reviews，支持多维度筛选和分页功能"""
    all_reviews = list_all_reviews()
    
    # 标签筛选
    if tags:
        tag_list = [tag.strip() for tag in tags.split(',')]
        all_reviews = [
            r for r in all_reviews 
            if any(tag in r.tags for tag in tag_list)
        ]
    
    # 日期范围筛选
    if date_from:
        try:
            from_date = datetime.strptime(date_from, "%Y-%m-%d")
            all_reviews = [
                r for r in all_reviews 
                if r.created_at >= from_date
            ]
        except ValueError:
            pass
    
    if date_to:
        try:
            to_date = datetime.strptime(date_to, "%Y-%m-%d")
            all_reviews = [
                r for r in all_reviews 
                if r.created_at <= to_date
            ]
        except ValueError:
            pass
    
    # 按创建时间倒序排序
    all_reviews.sort(key=lambda x: x.created_at, reverse=True)
    
    # 分页
    total = len(all_reviews)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_reviews = all_reviews[start_idx:end_idx]
    
    return {
        "reviews": [review.model_dump() for review in paginated_reviews],
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": (total + limit - 1) // limit
        }
    }


async def create_review(review_data: Dict[str, Any]) -> Review:
    """创建新的review"""
    review_id = str(uuid.uuid4())
    now = datetime.now()
    
    # 创建根 block
    from schemas.resources.block import CreateBlockRequest
    content = f"# {review_data.get('title', 'Review')}\n\n"
    
    root_block_request = CreateBlockRequest(
        content=content,
        parent_id=None
    )
    root_block = await blocks_service.create_block(root_block_request)
    
    review = Review(
        uuid=review_id,
        title=review_data.get("title", "Untitled Review"),
        created_at=now,
        root_block_id=root_block.id,  # root_block现在是BlockResponse对象
        tags=review_data.get("tags", []),
        summary=review_data.get("summary"),
    )
    
    save_review(review)
    return review


async def get_review(review_id: str) -> Optional[Review]:
    """获取review的详细信息"""
    return load_review(review_id)


async def update_review_metadata(review_id: str, update_data: Dict[str, Any]) -> Optional[Review]:
    """更新review的元数据"""
    review = load_review(review_id)
    if not review:
        return None
    
    # 更新字段
    if "title" in update_data:
        review.title = update_data["title"]
    if "tags" in update_data:
        review.tags = update_data["tags"]
    if "summary" in update_data:
        review.summary = update_data["summary"]
    
    save_review(review)
    return review


async def delete_review(review_id: str) -> bool:
    """删除review"""
    review = load_review(review_id)
    if not review:
        return False
    
    # 删除关联的 block
    await blocks_service.delete_block(review.root_block_id)
    
    # 删除文件
    delete_review_file(review_id)
    return True