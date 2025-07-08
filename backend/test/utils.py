"""
测试工具函数

包含测试中常用的工具和帮助函数
"""

import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
from unittest.mock import patch

from fastapi.testclient import TestClient
from httpx import AsyncClient


class APITestHelper:
    """API 测试帮助类"""
    
    def __init__(self, client: TestClient):
        self.client = client
    
    def assert_success_response(self, response, expected_status: int = 200):
        """断言响应成功"""
        assert response.status_code == expected_status, f"Expected {expected_status}, got {response.status_code}: {response.text}"
        return response.json()
    
    def assert_error_response(self, response, expected_status: int, expected_detail: str = None):
        """断言错误响应"""
        assert response.status_code == expected_status
        if expected_detail:
            data = response.json()
            assert expected_detail in data.get("detail", "")
    
    def assert_pagination_response(self, data: Dict[str, Any], expected_page: int = 1, expected_limit: int = 20):
        """断言分页响应格式"""
        assert "pagination" in data
        pagination = data["pagination"]
        assert pagination["page"] == expected_page
        assert pagination["limit"] == expected_limit
        assert "total" in pagination
        assert "total_pages" in pagination


class MockLLMService:
    """模拟 LLM 服务"""
    
    @staticmethod
    def mock_auto_expand_subtasks(todo_title: str, todo_description: str = "") -> List[Dict[str, Any]]:
        """模拟自动展开子任务"""
        now = datetime.now().isoformat()
        return [
            {
                "id": str(uuid.uuid4()),
                "content": f"{todo_title} - 子任务1",
                "status": "pending",
                "depends_on": [],
                "tags": [],
                "root_block_id": str(uuid.uuid4()),
                "created_at": now,
                "updated_at": now
            },
            {
                "id": str(uuid.uuid4()),
                "content": f"{todo_title} - 子任务2", 
                "status": "pending",
                "depends_on": [],
                "tags": [],
                "root_block_id": str(uuid.uuid4()),
                "created_at": now,
                "updated_at": now
            }
        ]
    
    @staticmethod
    def mock_upgrade_thought_to_knowledge(thought_content: str, thought_title: str = "") -> Dict[str, Any]:
        """模拟思考升级为知识"""
        return {
            "title": thought_title or "升级后的知识文档",
            "description": f"从思考升级：{thought_content[:100]}...",
            "tags": ["升级", "知识"],
            "root_block_id": str(uuid.uuid4())
        }
    
    @staticmethod
    def mock_auto_collect_review_content() -> Dict[str, Any]:
        """模拟自动收集回顾内容"""
        return {
            "thoughts_count": 5,
            "todos_completed": 3,
            "knowledges_created": 2,
            "key_insights": ["洞察1", "洞察2"],
            "collected_items": [
                {"type": "thought", "id": str(uuid.uuid4()), "title": "重要想法"},
                {"type": "todo", "id": str(uuid.uuid4()), "title": "完成的任务"},
                {"type": "knowledge", "id": str(uuid.uuid4()), "title": "新创建的知识"}
            ]
        }


def create_sample_blocks_chain(temp_dir: Path, count: int = 3) -> List[str]:
    """创建一系列链接的测试 blocks"""
    block_ids = []
    prev_id = None
    
    for i in range(count):
        block_data = {
            "content": f"测试 Block {i+1}",
            "parent_id": None,
            "prev_id": prev_id,
            "next_id": None,
            "first_child_id": None
        }
        
        # 创建当前block
        block_id = str(uuid.uuid4())
        block_data.update({
            "id": block_id,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        })
        
        # 更新前一个block的next_id
        if prev_id:
            prev_block_file = temp_dir / "blocks" / f"{prev_id}.json"
            with open(prev_block_file, 'r', encoding='utf-8') as f:
                prev_block_data = json.load(f)
            prev_block_data["next_id"] = block_id
            with open(prev_block_file, 'w', encoding='utf-8') as f:
                json.dump(prev_block_data, f, ensure_ascii=False, indent=2)
        
        # 保存当前block
        block_file = temp_dir / "blocks" / f"{block_id}.json"
        with open(block_file, 'w', encoding='utf-8') as f:
            json.dump(block_data, f, ensure_ascii=False, indent=2)
        
        block_ids.append(block_id)
        prev_id = block_id
    
    return block_ids


def create_hierarchical_blocks(temp_dir: Path, parent_id: str = None, depth: int = 2, width: int = 2) -> List[str]:
    """创建层级结构的测试 blocks"""
    if depth <= 0:
        return []
    
    block_ids = []
    prev_sibling_id = None
    first_child_id = None
    
    for i in range(width):
        # 创建当前层级的block
        block_data = {
            "content": f"层级 Block {depth}-{i+1}",
            "parent_id": parent_id,
            "prev_id": prev_sibling_id,
            "next_id": None,
            "first_child_id": None
        }
        
        block_id = str(uuid.uuid4())
        block_data.update({
            "id": block_id,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        })
        
        # 更新前一个兄弟的next_id
        if prev_sibling_id:
            prev_block_file = temp_dir / "blocks" / f"{prev_sibling_id}.json"
            with open(prev_block_file, 'r', encoding='utf-8') as f:
                prev_block_data = json.load(f)
            prev_block_data["next_id"] = block_id
            with open(prev_block_file, 'w', encoding='utf-8') as f:
                json.dump(prev_block_data, f, ensure_ascii=False, indent=2)
        
        # 如果是第一个子块，记录其ID
        if i == 0:
            first_child_id = block_id
        
        # 创建子级blocks
        children = create_hierarchical_blocks(temp_dir, block_id, depth - 1, width)
        if children:
            block_data["first_child_id"] = children[0]
        
        # 保存当前block
        block_file = temp_dir / "blocks" / f"{block_id}.json"
        with open(block_file, 'w', encoding='utf-8') as f:
            json.dump(block_data, f, ensure_ascii=False, indent=2)
        
        block_ids.append(block_id)
        prev_sibling_id = block_id
    
    # 更新父块的first_child_id
    if parent_id and first_child_id:
        parent_block_file = temp_dir / "blocks" / f"{parent_id}.json"
        if parent_block_file.exists():
            with open(parent_block_file, 'r', encoding='utf-8') as f:
                parent_block_data = json.load(f)
            parent_block_data["first_child_id"] = first_child_id
            with open(parent_block_file, 'w', encoding='utf-8') as f:
                json.dump(parent_block_data, f, ensure_ascii=False, indent=2)
    
    return block_ids


def assert_block_structure(block_data: Dict[str, Any]):
    """断言 block 数据结构正确"""
    required_fields = ["id", "content", "created_at", "updated_at"]
    for field in required_fields:
        assert field in block_data, f"Missing required field: {field}"
    
    optional_fields = ["parent_id", "prev_id", "next_id", "first_child_id"]
    for field in optional_fields:
        assert field in block_data, f"Missing optional field: {field}"


def assert_knowledge_structure(knowledge_data: Dict[str, Any]):
    """断言 knowledge 数据结构正确"""
    required_fields = ["id", "title", "description", "tags", "root_block_id", "created_at", "updated_at"]
    for field in required_fields:
        assert field in knowledge_data, f"Missing required field: {field}"
    
    optional_fields = ["linked_blocks", "backlinks"]
    for field in optional_fields:
        assert field in knowledge_data, f"Missing optional field: {field}"


def assert_thought_structure(thought_data: Dict[str, Any]):
    """断言 thought 数据结构正确"""
    required_fields = ["id", "summary", "tags", "root_block_id", "created_at", "updated_at"]
    for field in required_fields:
        assert field in thought_data, f"Missing required field: {field}"


def assert_todo_structure(todo_data: Dict[str, Any]):
    """断言 todo 数据结构正确"""
    required_fields = ["id", "title", "status", "created_at", "updated_at"]
    for field in required_fields:
        assert field in todo_data, f"Missing required field: {field}"
    
    optional_fields = ["description", "due_at", "subtasks", "linked_knowledge", "dependencies", "tags"]
    for field in optional_fields:
        if field in todo_data:
            assert todo_data[field] is not None or field in ["description", "due_at"], f"Field {field} should not be None"


def assert_review_structure(review_data: Dict[str, Any]):
    """断言 review 数据结构正确"""
    required_fields = ["id", "title", "created_at", "updated_at", "root_block_id"]
    for field in required_fields:
        assert field in review_data, f"Missing required field: {field}" 