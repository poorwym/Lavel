"""
Thoughts API 单元测试

测试 thoughts 相关的所有 API 端点功能
"""

import json
import pytest
from unittest.mock import patch
from test.conftest import create_test_thought, create_test_knowledge
from test.utils import APITestHelper, MockLLMService, assert_thought_structure, assert_knowledge_structure


class TestThoughtsAPI:
    """Thoughts API 测试类"""
    
    def setup_method(self):
        """每个测试方法执行前的设置"""
        pass
    
    def test_list_thoughts_empty(self, client, temp_lavel_dir):
        """测试列出空的 thoughts 列表"""
        helper = APITestHelper(client)
        
        response = client.get("/api/resources/thoughts/")
        data = helper.assert_success_response(response)
        
        helper.assert_pagination_response(data)
        assert data["thoughts"] == []
        assert data["pagination"]["total"] == 0
    
    def test_list_thoughts_with_data(self, client, temp_lavel_dir):
        """测试列出有数据的 thoughts 列表"""
        helper = APITestHelper(client)
        
        # 创建测试数据
        for i in range(3):
            create_test_thought(temp_lavel_dir, {
                "summary": f"这是测试想法 {i+1}",
                "tags": ["测试", f"标签{i+1}"]
            })
        
        response = client.get("/api/resources/thoughts/")
        data = helper.assert_success_response(response)
        
        helper.assert_pagination_response(data)
        assert len(data["thoughts"]) == 3
        assert data["pagination"]["total"] == 3
        
        # 验证每个thought的数据结构
        for thought in data["thoughts"]:
            assert_thought_structure(thought)
    
    def test_list_thoughts_pagination(self, client, temp_lavel_dir):
        """测试 thoughts 分页功能"""
        helper = APITestHelper(client)
        
        # 创建25个测试thoughts
        for i in range(25):
            create_test_thought(temp_lavel_dir, {
                "summary": f"想法内容 {i+1}",
                "tags": ["测试"]
            })
        
        # 测试第1页
        response = client.get("/api/resources/thoughts/?page=1&limit=10")
        data = helper.assert_success_response(response)
        
        helper.assert_pagination_response(data, expected_page=1, expected_limit=10)
        assert len(data["thoughts"]) == 10
        assert data["pagination"]["total"] == 25
        assert data["pagination"]["total_pages"] == 3
        
        # 测试最后一页
        response = client.get("/api/resources/thoughts/?page=3&limit=10")
        data = helper.assert_success_response(response)
        
        helper.assert_pagination_response(data, expected_page=3, expected_limit=10)
        assert len(data["thoughts"]) == 5
    
    def test_list_thoughts_filter_by_tags(self, client, temp_lavel_dir):
        """测试按标签筛选 thoughts"""
        helper = APITestHelper(client)
        
        # 创建带不同标签的想法
        create_test_thought(temp_lavel_dir, {
            "summary": "关于编程的想法",
            "tags": ["编程", "Python"]
        })
        create_test_thought(temp_lavel_dir, {
            "summary": "关于设计的想法",
            "tags": ["设计", "UI"]
        })
        create_test_thought(temp_lavel_dir, {
            "summary": "关于生活的想法",
            "tags": ["生活", "感悟"]
        })
        
        # 筛选设计相关的想法
        response = client.get("/api/resources/thoughts/?tags=设计")
        data = helper.assert_success_response(response)
        
        assert len(data["thoughts"]) == 1
        assert "设计" in data["thoughts"][0]["tags"]
    
    def test_list_thoughts_search(self, client, temp_lavel_dir):
        """测试搜索 thoughts"""
        helper = APITestHelper(client)
        
        # 创建测试数据
        create_test_thought(temp_lavel_dir, {
            "summary": "今天学习了 Python 编程，感觉很有趣"
        })
        create_test_thought(temp_lavel_dir, {
            "summary": "前端开发的新框架值得尝试"
        })
        
        # 搜索包含 "Python" 的想法
        response = client.get("/api/resources/thoughts/?search=Python")
        data = helper.assert_success_response(response)
        
        assert len(data["thoughts"]) >= 1
        # 验证搜索结果包含相关内容
        found_python = any("Python" in t["summary"] for t in data["thoughts"])
        assert found_python
    
    def test_list_thoughts_filter_by_date_range(self, client, temp_lavel_dir):
        """测试按日期范围筛选 thoughts"""
        helper = APITestHelper(client)
        
        # 创建一些测试数据（实际应该使用固定的日期）
        create_test_thought(temp_lavel_dir, {"summary": "2024年1月的想法"})
        create_test_thought(temp_lavel_dir, {"summary": "另一个想法"})
        
        # 测试日期范围筛选
        response = client.get("/api/resources/thoughts/?date_from=2024-01-01&date_to=2024-01-31")
        data = helper.assert_success_response(response)
        
        # 验证返回的数据格式正确
        helper.assert_pagination_response(data)
        assert isinstance(data["thoughts"], list)
    
    def test_create_thought_success(self, client, temp_lavel_dir, sample_thought_data):
        """测试成功创建 thought"""
        helper = APITestHelper(client)
        
        response = client.post("/api/resources/thoughts/", json=sample_thought_data)
        data = helper.assert_success_response(response)
        
        assert_thought_structure(data)
        assert data["summary"] == sample_thought_data["summary"]
        assert data["tags"] == sample_thought_data["tags"]
        assert "uuid" in data
        assert "created_at" in data
        
        # 验证文件是否被创建
        thought_file = temp_lavel_dir / "thoughts" / f"{data['uuid']}.json"
        assert thought_file.exists()
    
    def test_create_thought_minimal_data(self, client, temp_lavel_dir):
        """测试用最少数据创建 thought"""
        helper = APITestHelper(client)
        
        minimal_data = {"summary": "这是一个简单的想法"}
        
        response = client.post("/api/resources/thoughts/", json=minimal_data)
        data = helper.assert_success_response(response)
        
        assert data["summary"] == "这是一个简单的想法"
        assert "tags" in data   # 应该有默认值
        assert "uuid" in data   # 应该有生成的UUID
    
    def test_create_thought_with_auto_title(self, client, temp_lavel_dir):
        """测试创建 thought 时的基本功能"""
        helper = APITestHelper(client)
        
        data_with_summary = {
            "summary": "这是一个很长的想法内容，应该可以从中提取出合适的标题",
            "tags": ["测试"]
        }
        
        response = client.post("/api/resources/thoughts/", json=data_with_summary)
        data = helper.assert_success_response(response)
        
        assert data["summary"] == data_with_summary["summary"]
        assert data["tags"] == data_with_summary["tags"]
        assert "uuid" in data
    
    def test_get_thought_success(self, client, temp_lavel_dir):
        """测试成功获取 thought"""
        helper = APITestHelper(client)
        
        # 创建测试thought
        thought_id = create_test_thought(temp_lavel_dir)
        
        response = client.get(f"/api/resources/thoughts/{thought_id}")
        data = helper.assert_success_response(response)
        
        assert_thought_structure(data)
        assert data["uuid"] == thought_id
    
    def test_get_thought_not_found(self, client, temp_lavel_dir):
        """测试获取不存在的 thought"""
        helper = APITestHelper(client)
        
        fake_id = "non-existent-id"
        response = client.get(f"/api/resources/thoughts/{fake_id}")
        helper.assert_error_response(response, 404, "Thought not found")
    
    def test_update_thought_success(self, client, temp_lavel_dir):
        """测试成功更新 thought"""
        helper = APITestHelper(client)
        
        # 创建测试thought
        thought_id = create_test_thought(temp_lavel_dir, {
            "summary": "原始想法概述",
            "tags": ["原始标签"]
        })
        
        # 更新thought
        update_data = {
            "summary": "更新后的想法概述",
            "tags": ["新标签", "更新标签"]
        }
        
        response = client.patch(f"/api/resources/thoughts/{thought_id}", json=update_data)
        data = helper.assert_success_response(response)
        
        assert data["summary"] == "更新后的想法概述"
        assert data["tags"] == ["新标签", "更新标签"]
        assert data["uuid"] == thought_id
        
        # 验证文件是否被更新
        thought_file = temp_lavel_dir / "thoughts" / f"{thought_id}.json"
        with open(thought_file, 'r', encoding='utf-8') as f:
            file_data = json.load(f)
        assert file_data["summary"] == "更新后的想法概述"
    
    def test_update_thought_partial(self, client, temp_lavel_dir):
        """测试部分更新 thought"""
        helper = APITestHelper(client)
        
        # 创建测试thought
        thought_id = create_test_thought(temp_lavel_dir, {
            "summary": "原始想法概述",
            "tags": ["原始标签"]
        })
        
        # 只更新tags
        update_data = {"tags": ["新标签"]}
        
        response = client.patch(f"/api/resources/thoughts/{thought_id}", json=update_data)
        data = helper.assert_success_response(response)
        
        assert data["tags"] == ["新标签"]
        assert data["summary"] == "原始想法概述"  # 其他字段应该保持不变
    
    def test_update_thought_not_found(self, client, temp_lavel_dir):
        """测试更新不存在的 thought"""
        helper = APITestHelper(client)
        
        fake_id = "non-existent-id"
        update_data = {"summary": "新概述"}
        response = client.patch(f"/api/resources/thoughts/{fake_id}", json=update_data)
        helper.assert_error_response(response, 404, "Thought not found")
    
    def test_delete_thought_success(self, client, temp_lavel_dir):
        """测试成功删除 thought"""
        helper = APITestHelper(client)
        
        # 创建测试thought
        thought_id = create_test_thought(temp_lavel_dir)
        
        # 删除thought
        response = client.delete(f"/api/resources/thoughts/{thought_id}")
        data = helper.assert_success_response(response)
        
        assert data["success"] is True
        assert "message" in data
        
        # 验证文件是否被删除
        thought_file = temp_lavel_dir / "thoughts" / f"{thought_id}.json"
        assert not thought_file.exists()
    
    def test_delete_thought_not_found(self, client, temp_lavel_dir):
        """测试删除不存在的 thought"""
        helper = APITestHelper(client)
        
        fake_id = "non-existent-id"
        response = client.delete(f"/api/resources/thoughts/{fake_id}")
        helper.assert_error_response(response, 404, "Thought not found")
    
    @patch('service.resources.thoughts_service.upgrade_thought_to_knowledge')
    def test_upgrade_thought_to_knowledge_success(self, mock_upgrade, client, temp_lavel_dir):
        """测试成功将 thought 升级为 knowledge"""
        helper = APITestHelper(client)
        
        # 创建测试thought
        thought_id = create_test_thought(temp_lavel_dir, {
            "summary": "这是一个深入的想法，应该升级为知识文档",
            "tags": ["深度思考"]
        })
        
        # 模拟升级服务
        mock_knowledge_data = MockLLMService.mock_upgrade_thought_to_knowledge(
            "这是一个深入的想法，应该升级为知识文档", "深度思考"
        )
        mock_upgrade.return_value = {
            "success": True,
            "knowledge": mock_knowledge_data,
            "message": "Thought upgraded to knowledge successfully"
        }
        
        # 升级thought
        knowledge_data = {
            "title": "升级后的知识文档",
            "description": "从思考升级而来的详细描述"
        }
        
        response = client.post(f"/api/resources/thoughts/{thought_id}/upgrade", json=knowledge_data)
        data = helper.assert_success_response(response)
        
        assert data["success"] is True
        assert "knowledge" in data
        assert "message" in data
        assert data["message"] == "Thought upgraded to knowledge successfully"
    
    @patch('service.resources.thoughts_service.upgrade_thought_to_knowledge')
    def test_upgrade_thought_without_additional_data(self, mock_upgrade, client, temp_lavel_dir):
        """测试不提供附加数据的情况下升级 thought"""
        helper = APITestHelper(client)
        
        # 创建测试thought
        thought_id = create_test_thought(temp_lavel_dir, {
            "summary": "简单想法内容",
            "tags": ["简单想法"]
        })
        
        # 模拟升级服务
        mock_upgrade.return_value = {
            "success": True,
            "knowledge": MockLLMService.mock_upgrade_thought_to_knowledge("简单想法内容", "简单想法"),
            "message": "Thought upgraded to knowledge successfully"
        }
        
        # 不提供额外数据进行升级
        response = client.post(f"/api/resources/thoughts/{thought_id}/upgrade")
        data = helper.assert_success_response(response)
        
        assert data["success"] is True
        assert "knowledge" in data
    
    def test_upgrade_thought_not_found(self, client, temp_lavel_dir):
        """测试升级不存在的 thought"""
        helper = APITestHelper(client)
        
        fake_id = "non-existent-id"
        response = client.post(f"/api/resources/thoughts/{fake_id}/upgrade")
        helper.assert_error_response(response, 404, "Thought not found")
    
    def test_search_thoughts_success(self, client, temp_lavel_dir):
        """测试搜索 thoughts"""
        helper = APITestHelper(client)
        
        # 创建测试数据
        create_test_thought(temp_lavel_dir, {
            "summary": "关于机器学习的深度思考",
            "tags": ["ML思考"]
        })
        create_test_thought(temp_lavel_dir, {
            "summary": "前端开发的新趋势",
            "tags": ["前端想法"]
        })
        create_test_thought(temp_lavel_dir, {
            "summary": "今天学习了新的算法，机器学习真是太有趣了",
            "tags": ["学习心得"]
        })
        
        # 搜索包含 "机器学习" 的想法
        response = client.get("/api/resources/thoughts/search?query=机器学习")
        data = helper.assert_success_response(response)
        
        assert "results" in data
        assert len(data["results"]) >= 2
        
        # 验证搜索结果相关性
        for result in data["results"]:
            thought = result["thought"]
            summary_match = "机器学习" in thought["summary"]
            tags_match = any("机器学习" in tag for tag in thought["tags"])
            assert summary_match or tags_match
    
    def test_search_thoughts_no_results(self, client, temp_lavel_dir):
        """测试搜索无结果的情况"""
        helper = APITestHelper(client)
        
        # 创建一些不相关的测试数据
        create_test_thought(temp_lavel_dir, {
            "summary": "今天天气很好",
            "tags": ["天气想法"]
        })
        
        # 搜索不存在的内容
        response = client.get("/api/resources/thoughts/search?query=不存在的内容")
        data = helper.assert_success_response(response)
        
        assert "results" in data
        assert len(data["results"]) == 0
    
    def test_list_thoughts_with_different_tags(self, client, temp_lavel_dir):
        """测试不同标签的 thoughts 列表"""
        helper = APITestHelper(client)
        
        # 创建不同标签的想法
        tag_categories = ["学习", "工作", "生活", "技术", "感悟"]
        for i, tag in enumerate(tag_categories):
            create_test_thought(temp_lavel_dir, {
                "summary": f"关于{tag}的想法",
                "tags": [tag, f"想法{i+1}"]
            })
        
        response = client.get("/api/resources/thoughts/")
        data = helper.assert_success_response(response)
        
        assert len(data["thoughts"]) == 5
        
        # 验证所有标签都被正确保存
        all_tags = []
        for thought in data["thoughts"]:
            all_tags.extend(thought["tags"])
        for tag in tag_categories:
            assert tag in all_tags
    
    def test_list_thoughts_with_various_content(self, client, temp_lavel_dir):
        """测试不同内容类型的 thoughts 列表"""
        helper = APITestHelper(client)
        
        # 创建不同类型的想法
        thought_types = [
            {"summary": "技术相关的想法", "tags": ["技术", "编程"]},
            {"summary": "生活感悟类想法", "tags": ["生活", "感悟"]},
            {"summary": "工作计划想法", "tags": ["工作", "计划"]},
            {"summary": "学习心得想法", "tags": ["学习", "心得"]}
        ]
        
        for thought_data in thought_types:
            create_test_thought(temp_lavel_dir, thought_data)
        
        response = client.get("/api/resources/thoughts/")
        data = helper.assert_success_response(response)
        
        assert len(data["thoughts"]) == 4
        
        # 验证所有想法都被正确保存
        summaries = [t["summary"] for t in data["thoughts"]]
        for thought_data in thought_types:
            assert thought_data["summary"] in summaries
    
    def test_list_thoughts_query_params_validation(self, client, temp_lavel_dir):
        """测试查询参数验证"""
        helper = APITestHelper(client)
        
        # 测试无效的页码
        response = client.get("/api/resources/thoughts/?page=0")
        helper.assert_error_response(response, 422)  # Validation error
        
        # 测试无效的限制数量
        response = client.get("/api/resources/thoughts/?limit=101")
        helper.assert_error_response(response, 422)  # Validation error
        
        # 测试无效的日期格式（应该被忽略，返回200）
        response = client.get("/api/resources/thoughts/?date_from=invalid-date")
        helper.assert_success_response(response)  # 无效日期被忽略，正常返回
        
        # 测试空的搜索查询（应该返回空结果）
        response = client.get("/api/resources/thoughts/search?query=")
        data = helper.assert_success_response(response)
        assert len(data["results"]) == 0 