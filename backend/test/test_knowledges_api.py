"""
Knowledges API 单元测试

测试 knowledges 相关的所有 API 端点功能
"""

import json
import pytest
from unittest.mock import patch, mock_open
from test.conftest import create_test_knowledge, create_test_block
from test.utils import APITestHelper, assert_knowledge_structure


class TestKnowledgesAPI:
    """Knowledges API 测试类"""
    
    def setup_method(self):
        """每个测试方法执行前的设置"""
        pass
    
    def test_list_knowledges_empty(self, client, temp_lavel_dir):
        """测试列出空的 knowledges 列表"""
        helper = APITestHelper(client)
        
        response = client.get("/api/resources/knowledges/")
        data = helper.assert_success_response(response)
        
        helper.assert_pagination_response(data)
        assert data["knowledges"] == []
        assert data["pagination"]["total"] == 0
    
    def test_list_knowledges_with_data(self, client, temp_lavel_dir):
        """测试列出有数据的 knowledges 列表"""
        helper = APITestHelper(client)
        
        # 创建测试数据
        for i in range(3):
            create_test_knowledge(temp_lavel_dir, {
                "title": f"测试知识 {i+1}",
                "description": f"测试描述 {i+1}",
                "tags": ["测试", f"标签{i+1}"]
            })
        
        response = client.get("/api/resources/knowledges/")
        data = helper.assert_success_response(response)
        
        helper.assert_pagination_response(data)
        assert len(data["knowledges"]) == 3
        assert data["pagination"]["total"] == 3
        
        # 验证每个knowledge的数据结构
        for knowledge in data["knowledges"]:
            assert_knowledge_structure(knowledge)
    
    def test_list_knowledges_pagination(self, client, temp_lavel_dir):
        """测试 knowledges 分页功能"""
        helper = APITestHelper(client)
        
        # 创建25个测试knowledges
        for i in range(25):
            create_test_knowledge(temp_lavel_dir, {
                "title": f"知识文档 {i+1}",
                "description": f"描述 {i+1}",
                "tags": ["测试"]
            })
        
        # 测试第1页
        response = client.get("/api/resources/knowledges/?page=1&limit=10")
        data = helper.assert_success_response(response)
        
        helper.assert_pagination_response(data, expected_page=1, expected_limit=10)
        assert len(data["knowledges"]) == 10
        assert data["pagination"]["total"] == 25
        assert data["pagination"]["total_pages"] == 3
        
        # 测试最后一页
        response = client.get("/api/resources/knowledges/?page=3&limit=10")
        data = helper.assert_success_response(response)
        
        helper.assert_pagination_response(data, expected_page=3, expected_limit=10)
        assert len(data["knowledges"]) == 5
    
    def test_list_knowledges_filter_by_tags(self, client, temp_lavel_dir):
        """测试按标签筛选 knowledges"""
        helper = APITestHelper(client)
        
        # 创建带不同标签的知识
        create_test_knowledge(temp_lavel_dir, {
            "title": "Python 知识",
            "tags": ["Python", "编程"]
        })
        create_test_knowledge(temp_lavel_dir, {
            "title": "JavaScript 知识", 
            "tags": ["JavaScript", "编程"]
        })
        create_test_knowledge(temp_lavel_dir, {
            "title": "设计知识",
            "tags": ["设计", "UI"]
        })
        
        # 筛选编程相关的知识
        response = client.get("/api/resources/knowledges/?tags=编程")
        data = helper.assert_success_response(response)
        
        assert len(data["knowledges"]) == 2
        for knowledge in data["knowledges"]:
            assert "编程" in knowledge["tags"]
    
    def test_list_knowledges_search(self, client, temp_lavel_dir):
        """测试搜索 knowledges"""
        helper = APITestHelper(client)
        
        # 创建测试数据
        create_test_knowledge(temp_lavel_dir, {
            "title": "Python 编程指南",
            "description": "详细的 Python 编程教程"
        })
        create_test_knowledge(temp_lavel_dir, {
            "title": "Web 开发",
            "description": "现代 Web 开发技术栈"
        })
        
        # 搜索 Python 相关内容
        response = client.get("/api/resources/knowledges/?search=Python")
        data = helper.assert_success_response(response)
        
        assert len(data["knowledges"]) >= 1
        # 验证搜索结果包含相关内容
        found_python = any("Python" in k["title"] or "Python" in k["description"] 
                          for k in data["knowledges"])
        assert found_python
    
    def test_create_knowledge_success(self, client, temp_lavel_dir, sample_knowledge_data):
        """测试成功创建 knowledge"""
        helper = APITestHelper(client)
        
        response = client.post("/api/resources/knowledges/", json=sample_knowledge_data)
        data = helper.assert_success_response(response)
        
        assert_knowledge_structure(data)
        assert data["title"] == sample_knowledge_data["title"]
        assert data["description"] == sample_knowledge_data["description"]
        assert data["tags"] == sample_knowledge_data["tags"]
        assert "id" in data
        assert "created_at" in data
        
        # 验证文件是否被创建
        knowledge_file = temp_lavel_dir / "knowledges" / f"{data['id']}.json"
        assert knowledge_file.exists()
    
    def test_create_knowledge_minimal_data(self, client, temp_lavel_dir):
        """测试用最少数据创建 knowledge"""
        helper = APITestHelper(client)
        
        minimal_data = {
            "title": "最小知识文档",
            "root_block_id": "test-block-id"
        }
        
        response = client.post("/api/resources/knowledges/", json=minimal_data)
        data = helper.assert_success_response(response)
        
        assert data["title"] == "最小知识文档"
        assert data["description"] == ""  # 应该有默认值
        assert data["tags"] == []  # 应该有默认值
    
    def test_get_knowledge_success(self, client, temp_lavel_dir):
        """测试成功获取 knowledge"""
        helper = APITestHelper(client)
        
        # 创建测试knowledge
        knowledge_id = create_test_knowledge(temp_lavel_dir)
        
        response = client.get(f"/api/resources/knowledges/{knowledge_id}")
        data = helper.assert_success_response(response)
        
        assert_knowledge_structure(data)
        assert data["id"] == knowledge_id
    
    def test_get_knowledge_not_found(self, client, temp_lavel_dir):
        """测试获取不存在的 knowledge"""
        helper = APITestHelper(client)
        
        fake_id = "non-existent-id"
        response = client.get(f"/api/resources/knowledges/{fake_id}")
        helper.assert_error_response(response, 404, "Knowledge not found")
    
    def test_update_knowledge_metadata_success(self, client, temp_lavel_dir):
        """测试成功更新 knowledge 元数据"""
        helper = APITestHelper(client)
        
        # 创建测试knowledge
        knowledge_id = create_test_knowledge(temp_lavel_dir, {
            "title": "原始标题",
            "description": "原始描述",
            "tags": ["原始标签"]
        })
        
        # 更新元数据
        update_data = {
            "title": "更新后的标题",
            "description": "更新后的描述",
            "tags": ["新标签", "更新标签"]
        }
        
        response = client.patch(f"/api/resources/knowledges/{knowledge_id}", json=update_data)
        data = helper.assert_success_response(response)
        
        assert data["title"] == "更新后的标题"
        assert data["description"] == "更新后的描述"
        assert data["tags"] == ["新标签", "更新标签"]
        assert data["id"] == knowledge_id
        
        # 验证文件是否被更新
        knowledge_file = temp_lavel_dir / "knowledges" / f"{knowledge_id}.json"
        with open(knowledge_file, 'r', encoding='utf-8') as f:
            file_data = json.load(f)
        assert file_data["title"] == "更新后的标题"
    
    def test_update_knowledge_metadata_not_found(self, client, temp_lavel_dir):
        """测试更新不存在的 knowledge"""
        helper = APITestHelper(client)
        
        fake_id = "non-existent-id"
        update_data = {"title": "新标题"}
        response = client.patch(f"/api/resources/knowledges/{fake_id}", json=update_data)
        helper.assert_error_response(response, 404, "Knowledge not found")
    
    def test_delete_knowledge_success(self, client, temp_lavel_dir):
        """测试成功删除 knowledge"""
        helper = APITestHelper(client)
        
        # 创建测试knowledge
        knowledge_id = create_test_knowledge(temp_lavel_dir)
        
        # 删除knowledge
        response = client.delete(f"/api/resources/knowledges/{knowledge_id}")
        data = helper.assert_success_response(response)
        
        assert data["success"] is True
        assert "message" in data
        
        # 验证文件是否被删除
        knowledge_file = temp_lavel_dir / "knowledges" / f"{knowledge_id}.json"
        assert not knowledge_file.exists()
    
    def test_delete_knowledge_not_found(self, client, temp_lavel_dir):
        """测试删除不存在的 knowledge"""
        helper = APITestHelper(client)
        
        fake_id = "non-existent-id"
        response = client.delete(f"/api/resources/knowledges/{fake_id}")
        helper.assert_error_response(response, 404, "Knowledge not found")
    
    def test_export_knowledge_to_markdown_success(self, client, temp_lavel_dir):
        """测试成功导出 knowledge 为 Markdown"""
        helper = APITestHelper(client)
        
        # 创建测试knowledge和关联的blocks
        block_id = create_test_block(temp_lavel_dir, {"content": "# 测试内容\n\n这是知识文档的内容。"})
        knowledge_id = create_test_knowledge(temp_lavel_dir, {
            "title": "测试知识文档",
            "description": "测试描述",
            "tags": ["测试", "Markdown"],
            "root_block_id": block_id
        })
        
        # 导出为Markdown
        response = client.post(f"/api/resources/knowledges/{knowledge_id}/export")
        
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/markdown; charset=utf-8"
        assert "attachment" in response.headers["content-disposition"]
        
        # 验证内容
        markdown_content = response.text
        assert "测试知识文档" in markdown_content
        assert "测试内容" in markdown_content
    
    def test_export_knowledge_with_options(self, client, temp_lavel_dir):
        """测试带选项导出 knowledge"""
        helper = APITestHelper(client)
        
        # 创建测试knowledge
        knowledge_id = create_test_knowledge(temp_lavel_dir)
        
        # 测试包含元数据和反向链接的导出
        response = client.post(
            f"/api/resources/knowledges/{knowledge_id}/export"
            "?include_metadata=true&include_backlinks=true"
        )
        
        assert response.status_code == 200
        markdown_content = response.text
        
        # 验证包含元数据和反向链接部分
        assert "Tags:" in markdown_content or "标签:" in markdown_content
        assert "Created:" in markdown_content or "创建时间:" in markdown_content
    
    def test_export_knowledge_not_found(self, client, temp_lavel_dir):
        """测试导出不存在的 knowledge"""
        helper = APITestHelper(client)
        
        fake_id = "non-existent-id"
        response = client.post(f"/api/resources/knowledges/{fake_id}/export")
        helper.assert_error_response(response, 404, "Knowledge not found")
    
    def test_get_knowledge_backlinks_success(self, client, temp_lavel_dir):
        """测试成功获取 knowledge 反向链接"""
        helper = APITestHelper(client)
        
        # 创建测试knowledge
        knowledge_id = create_test_knowledge(temp_lavel_dir, {
            "title": "被引用的知识",
            "backlinks": ["ref1", "ref2"]
        })
        
        response = client.get(f"/api/resources/knowledges/{knowledge_id}/backlinks")
        data = helper.assert_success_response(response)
        
        # 验证反向链接结构
        assert isinstance(data, dict)
        expected_keys = ["knowledges", "thoughts", "todos", "blocks"]
        for key in expected_keys:
            assert key in data
            assert isinstance(data[key], list)
    
    def test_get_knowledge_backlinks_not_found(self, client, temp_lavel_dir):
        """测试获取不存在 knowledge 的反向链接"""
        helper = APITestHelper(client)
        
        fake_id = "non-existent-id"
        response = client.get(f"/api/resources/knowledges/{fake_id}/backlinks")
        helper.assert_error_response(response, 404, "Knowledge not found")
    
    def test_link_block_to_knowledge_success(self, client, temp_lavel_dir):
        """测试成功链接 block 到 knowledge"""
        helper = APITestHelper(client)
        
        # 创建测试数据
        knowledge_id = create_test_knowledge(temp_lavel_dir)
        block_id = create_test_block(temp_lavel_dir)
        
        # 链接block到knowledge
        link_data = {
            "block_id": block_id,
            "position": 0,
            "link_type": "reference"
        }
        
        response = client.post(f"/api/resources/knowledges/{knowledge_id}/link-block", json=link_data)
        data = helper.assert_success_response(response)
        
        assert data["success"] is True
        assert "linked_block_id" in data
        assert data["linked_block_id"] == block_id
    
    def test_link_block_to_knowledge_not_found(self, client, temp_lavel_dir):
        """测试链接 block 到不存在的 knowledge"""
        helper = APITestHelper(client)
        
        # 创建测试block
        block_id = create_test_block(temp_lavel_dir)
        
        fake_knowledge_id = "non-existent-knowledge"
        link_data = {"block_id": block_id}
        
        response = client.post(f"/api/resources/knowledges/{fake_knowledge_id}/link-block", json=link_data)
        helper.assert_error_response(response, 404, "Knowledge or block not found")
    
    def test_link_nonexistent_block_to_knowledge(self, client, temp_lavel_dir):
        """测试链接不存在的 block 到 knowledge"""
        helper = APITestHelper(client)
        
        # 创建测试knowledge
        knowledge_id = create_test_knowledge(temp_lavel_dir)
        
        fake_block_id = "non-existent-block"
        link_data = {"block_id": fake_block_id}
        
        response = client.post(f"/api/resources/knowledges/{knowledge_id}/link-block", json=link_data)
        helper.assert_error_response(response, 404, "Knowledge or block not found")
    
    def test_search_knowledges_success(self, client, temp_lavel_dir):
        """测试搜索 knowledges"""
        helper = APITestHelper(client)
        
        # 创建测试数据
        create_test_knowledge(temp_lavel_dir, {
            "title": "Python 编程指南",
            "description": "完整的 Python 教程"
        })
        create_test_knowledge(temp_lavel_dir, {
            "title": "Web 开发教程",
            "description": "使用 Python 进行 Web 开发"
        })
        create_test_knowledge(temp_lavel_dir, {
            "title": "数据科学入门",
            "description": "机器学习和数据分析基础"
        })
        
        # 搜索包含 "Python" 的知识
        response = client.get("/api/resources/knowledges/search?query=Python")
        data = helper.assert_success_response(response)
        
        assert "results" in data
        assert len(data["results"]) >= 2
        
        # 验证搜索结果相关性
        for result in data["results"]:
            knowledge = result["knowledge"]
            title_match = "Python" in knowledge["title"]
            desc_match = "Python" in knowledge["description"]
            assert title_match or desc_match
    
    def test_search_knowledges_no_results(self, client, temp_lavel_dir):
        """测试搜索无结果的情况"""
        helper = APITestHelper(client)
        
        # 创建一些不相关的测试数据
        create_test_knowledge(temp_lavel_dir, {
            "title": "设计原理",
            "description": "UI/UX 设计基础"
        })
        
        # 搜索不存在的内容
        response = client.get("/api/resources/knowledges/search?query=NotExistentTopic")
        data = helper.assert_success_response(response)
        
        assert "results" in data
        assert len(data["results"]) == 0
    
    def test_list_knowledges_query_params_validation(self, client, temp_lavel_dir):
        """测试查询参数验证"""
        helper = APITestHelper(client)
        
        # 测试无效的页码
        response = client.get("/api/resources/knowledges/?page=0")
        helper.assert_error_response(response, 422)  # Validation error
        
        # 测试无效的限制数量
        response = client.get("/api/resources/knowledges/?limit=101")
        helper.assert_error_response(response, 422)  # Validation error
        
        # 测试空的搜索查询
        response = client.get("/api/resources/knowledges/search?query=")
        helper.assert_error_response(response, 422)  # Validation error 