"""
pytest 配置文件

包含所有测试共享的 fixtures 和配置
"""

import asyncio
import json
import os
import shutil
import tempfile
import uuid
from datetime import datetime
from pathlib import Path
from typing import AsyncGenerator, Dict, Any, Generator
from unittest.mock import patch

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from httpx import AsyncClient

from main import app
from utils.config import Config


@pytest.fixture(scope="session")
def event_loop():
    """创建事件循环用于异步测试"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def temp_lavel_dir() -> Generator[Path, None, None]:
    """创建临时的.Lavel目录用于测试"""
    with tempfile.TemporaryDirectory() as temp_dir:
        lavel_dir = Path(temp_dir) / ".Lavel"
        lavel_dir.mkdir(parents=True, exist_ok=True)
        
        # 创建所需的子目录
        (lavel_dir / "blocks").mkdir(exist_ok=True)
        (lavel_dir / "knowledges").mkdir(exist_ok=True)
        (lavel_dir / "thoughts").mkdir(exist_ok=True)
        (lavel_dir / "todos").mkdir(exist_ok=True)
        (lavel_dir / "reviews").mkdir(exist_ok=True)
        
        # 临时替换 Config.lavel_dir
        original_lavel_dir = Config.lavel_dir
        Config.lavel_dir = lavel_dir
        
        yield lavel_dir
        
        # 恢复原始配置
        Config.lavel_dir = original_lavel_dir


@pytest.fixture
def client() -> TestClient:
    """创建测试客户端"""
    return TestClient(app)


@pytest_asyncio.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    """创建异步测试客户端"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def sample_block_data() -> Dict[str, Any]:
    """示例 block 数据"""
    return {
        "content": "这是一个测试 block",
        "parent_id": None,
        "prev_id": None,
        "next_id": None,
        "first_child_id": None
    }


@pytest.fixture
def sample_knowledge_data() -> Dict[str, Any]:
    """示例 knowledge 数据"""
    return {
        "title": "测试知识文档",
        "description": "这是一个测试用的知识文档",
        "tags": ["测试", "示例"],
        "root_block_id": str(uuid.uuid4())
    }


@pytest.fixture
def sample_thought_data() -> Dict[str, Any]:
    """示例 thought 数据"""
    return {
        "summary": "这是一个测试想法的概述",
        "tags": ["测试", "想法"]
    }


@pytest.fixture
def sample_todo_data() -> Dict[str, Any]:
    """示例 todo 数据"""
    return {
        "title": "测试任务",
        "description": "这是一个测试任务",
        "due_date": "2024-12-31",
        "tags": ["测试", "任务"],
        "auto_expand": False
    }


@pytest.fixture
def sample_review_data() -> Dict[str, Any]:
    """示例 review 数据"""
    return {
        "title": "测试回顾",
        "tags": ["测试", "回顾"],
        "summary": "这是一个测试回顾的摘要"
    }


@pytest.fixture
def mock_datetime_now():
    """模拟当前时间"""
    fixed_time = datetime(2024, 1, 1, 12, 0, 0)
    with patch('datetime.datetime') as mock_dt:
        mock_dt.now.return_value = fixed_time
        mock_dt.side_effect = lambda *args, **kw: datetime(*args, **kw)
        yield fixed_time


def create_test_block(temp_dir: Path, block_data: Dict[str, Any] = None) -> str:
    """创建测试用的 block 文件"""
    if block_data is None:
        block_data = {
            "content": "测试内容",
            "parent_id": None,
            "prev_id": None,
            "next_id": None,
            "first_child_id": None
        }
    
    block_id = str(uuid.uuid4())
    block_data.update({
        "id": block_id,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    })
    
    blocks_dir = temp_dir / "blocks"
    block_file = blocks_dir / f"{block_id}.json"
    
    with open(block_file, 'w', encoding='utf-8') as f:
        json.dump(block_data, f, ensure_ascii=False, indent=2)
    
    return block_id


def create_test_knowledge(temp_dir: Path, knowledge_data: Dict[str, Any] = None) -> str:
    """创建测试用的 knowledge 文件"""
    default_data = {
        "title": "测试知识",
        "description": "测试描述",
        "tags": ["测试"],
        "root_block_id": str(uuid.uuid4())
    }
    
    if knowledge_data is not None:
        default_data.update(knowledge_data)
    
    knowledge_data = default_data
    
    knowledge_id = str(uuid.uuid4())
    knowledge_data.update({
        "id": knowledge_id,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
        "linked_blocks": [],
        "backlinks": []
    })
    
    knowledges_dir = temp_dir / "knowledges"
    knowledge_file = knowledges_dir / f"{knowledge_id}.json"
    
    with open(knowledge_file, 'w', encoding='utf-8') as f:
        json.dump(knowledge_data, f, ensure_ascii=False, indent=2)
    
    return knowledge_id


def create_test_thought(temp_dir: Path, thought_data: Dict[str, Any] = None) -> str:
    """创建测试用的 thought 文件"""
    default_data = {
        "summary": "测试想法内容",
        "tags": ["测试"],
        "root_block_id": str(uuid.uuid4())
    }
    
    if thought_data is not None:
        default_data.update(thought_data)
    
    thought_data = default_data
    
    thought_id = str(uuid.uuid4())
    thought_data.update({
        "id": thought_id,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    })
    
    thoughts_dir = temp_dir / "thoughts"
    thought_file = thoughts_dir / f"{thought_id}.json"
    
    with open(thought_file, 'w', encoding='utf-8') as f:
        json.dump(thought_data, f, ensure_ascii=False, indent=2)
    
    return thought_id


def create_test_todo(temp_dir: Path, todo_data: Dict[str, Any] = None) -> str:
    """创建测试用的 todo 文件"""
    default_data = {
        "title": "测试任务",
        "description": "测试任务描述",
        "status": "pending",
        "tags": ["测试"],
        "root_block_id": str(uuid.uuid4()),
        "subtasks": [],
        "linked_knowledge": [],
        "dependencies": []
    }
    
    if todo_data is not None:
        default_data.update(todo_data)
    
    todo_data = default_data
    
    todo_id = str(uuid.uuid4())
    todo_data.update({
        "id": todo_id,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    })
    
    # 处理子任务数据，确保每个子任务都有必需的字段
    if "subtasks" in todo_data and todo_data["subtasks"]:
        processed_subtasks = []
        for subtask in todo_data["subtasks"]:
            processed_subtask = {
                "id": subtask.get("uuid", subtask.get("id", str(uuid.uuid4()))),
                "content": subtask.get("content", subtask.get("title", "默认子任务内容")),
                "status": subtask.get("status", "pending"),
                "depends_on": subtask.get("depends_on", []),
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "tags": subtask.get("tags", []),
                "root_block_id": subtask.get("root_block_id", str(uuid.uuid4()))
            }
            processed_subtasks.append(processed_subtask)
        todo_data["subtasks"] = processed_subtasks
    
    todos_dir = temp_dir / "todos"
    todo_file = todos_dir / f"{todo_id}.json"
    
    with open(todo_file, 'w', encoding='utf-8') as f:
        json.dump(todo_data, f, ensure_ascii=False, indent=2)
    
    return todo_id


def create_test_review(temp_dir: Path, review_data: Dict[str, Any] = None) -> str:
    """创建测试用的 review 文件"""
    default_data = {
        "title": "测试回顾",
        "tags": ["测试"],
        "root_block_id": str(uuid.uuid4()),
        "summary": "测试回顾摘要"
    }
    
    if review_data is not None:
        default_data.update(review_data)
    
    review_data = default_data
    
    review_id = str(uuid.uuid4())
    review_data.update({
        "id": review_id,
        "created_at": datetime.now().isoformat()
    })
    
    reviews_dir = temp_dir / "reviews"
    review_file = reviews_dir / f"{review_id}.json"
    
    with open(review_file, 'w', encoding='utf-8') as f:
        json.dump(review_data, f, ensure_ascii=False, indent=2)
    
    return review_id 