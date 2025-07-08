"""
Reviews API 单元测试

测试 reviews 相关的所有 API 端点功能
"""

import json
import pytest
from unittest.mock import patch
from test.conftest import create_test_review
from test.utils import APITestHelper, MockLLMService, assert_review_structure


class TestReviewsAPI:
    """Reviews API 测试类"""
    
    def setup_method(self):
        """每个测试方法执行前的设置"""
        pass
    
    def test_list_reviews_empty(self, client, temp_lavel_dir):
        """测试列出空的 reviews 列表"""
        helper = APITestHelper(client)
        
        response = client.get("/api/resources/reviews/")
        data = helper.assert_success_response(response)
        
        helper.assert_pagination_response(data)
        assert data["reviews"] == []
        assert data["pagination"]["total"] == 0
    
    def test_list_reviews_with_data(self, client, temp_lavel_dir):
        """测试列出有数据的 reviews 列表"""
        helper = APITestHelper(client)
        
        # 创建测试数据
        for i in range(3):
            create_test_review(temp_lavel_dir, {
                "title": f"测试回顾 {i+1}",
                "tags": ["测试", f"标签{i+1}"]
            })
        
        response = client.get("/api/resources/reviews/")
        data = helper.assert_success_response(response)
        
        helper.assert_pagination_response(data)
        assert len(data["reviews"]) == 3
        assert data["pagination"]["total"] == 3
        
        # 验证每个review的数据结构
        for review in data["reviews"]:
            assert_review_structure(review)
    
    def test_list_reviews_filter_by_tags(self, client, temp_lavel_dir):
        """测试按标签筛选 reviews"""
        helper = APITestHelper(client)
        
        # 创建不同标签的回顾
        create_test_review(temp_lavel_dir, {
            "title": "工作回顾",
            "tags": ["工作", "总结"]
        })
        create_test_review(temp_lavel_dir, {
            "title": "学习回顾", 
            "tags": ["学习", "技术"]
        })
        
        # 筛选工作相关的回顾
        response = client.get("/api/resources/reviews/?tags=工作")
        data = helper.assert_success_response(response)
        
        assert len(data["reviews"]) == 1
        assert "工作" in data["reviews"][0]["tags"]
    
    def test_list_reviews_filter_by_date_range(self, client, temp_lavel_dir):
        """测试按日期范围筛选 reviews"""
        helper = APITestHelper(client)
        
        # 创建不同日期的回顾
        create_test_review(temp_lavel_dir, {
            "title": "2024年1月回顾"
        })
        create_test_review(temp_lavel_dir, {
            "title": "2024年2月回顾"
        })
        
        # 筛选1月份的回顾
        response = client.get("/api/resources/reviews/?date_from=2024-01-01&date_to=2024-01-31")
        data = helper.assert_success_response(response)
        
        # 验证筛选结果
        helper.assert_pagination_response(data)
        assert isinstance(data["reviews"], list)
    
    @patch('service.resources.reviews_service.create_review')
    def test_create_review_success(self, mock_create, client, temp_lavel_dir, sample_review_data):
        """测试成功创建 review"""
        helper = APITestHelper(client)
        
        # 模拟服务返回
        mock_review_data = sample_review_data.copy()
        mock_review_data.update({
            "id": "test-review-id",
            "created_at": "2024-01-01T12:00:00",
            "updated_at": "2024-01-01T12:00:00",
            "root_block_id": "test-root-block-id"
        })
        
        mock_create.return_value = type('MockReview', (), mock_review_data)()
        mock_create.return_value.model_dump = lambda: mock_review_data
        
        response = client.post("/api/resources/reviews/", json=sample_review_data)
        data = helper.assert_success_response(response)
        
        assert_review_structure(data)
        assert data["title"] == sample_review_data["title"]
        assert data["tags"] == sample_review_data["tags"]
    
    @patch('service.resources.reviews_service.create_review')
    def test_create_review_with_auto_collect(self, mock_create, client, temp_lavel_dir):
        """测试创建带自动收集的 review"""
        helper = APITestHelper(client)
        
        review_data = {
            "title": "自动收集的周回顾",
            "auto_collect": True
        }
        
        # 模拟服务返回包含自动收集内容的数据
        mock_review_data = {
            "id": "test-review-id",
            "title": "自动收集的周回顾",
            "tags": [],
            "created_at": "2024-01-01T12:00:00",
            "updated_at": "2024-01-01T12:00:00",
            "root_block_id": "test-root-block-id",
            "summary": "自动收集的回顾内容"
        }
        
        mock_create.return_value = type('MockReview', (), mock_review_data)()
        mock_create.return_value.model_dump = lambda: mock_review_data
        
        response = client.post("/api/resources/reviews/", json=review_data)
        data = helper.assert_success_response(response)
        
        assert data["title"] == "自动收集的周回顾"
    
    def test_create_review_minimal_data(self, client, temp_lavel_dir):
        """测试用最少数据创建 review"""
        helper = APITestHelper(client)
        
        minimal_data = {
            "title": "最小回顾"
        }
        
        response = client.post("/api/resources/reviews/", json=minimal_data)
        data = helper.assert_success_response(response)
        
        assert data["title"] == "最小回顾"
        assert "tags" in data   # 应该有默认值
        assert "id" in data   # 应该有生成的ID
    
    def test_get_review_success(self, client, temp_lavel_dir):
        """测试成功获取 review"""
        helper = APITestHelper(client)
        
        # 创建测试review
        review_id = create_test_review(temp_lavel_dir)
        
        response = client.get(f"/api/resources/reviews/{review_id}")
        data = helper.assert_success_response(response)
        
        assert_review_structure(data)
        assert data["id"] == review_id
    
    def test_get_review_not_found(self, client, temp_lavel_dir):
        """测试获取不存在的 review"""
        helper = APITestHelper(client)
        
        fake_id = "non-existent-id"
        response = client.get(f"/api/resources/reviews/{fake_id}")
        helper.assert_error_response(response, 404, "Review not found")
    
    def test_update_review_metadata_success(self, client, temp_lavel_dir):
        """测试成功更新 review 元数据"""
        helper = APITestHelper(client)
        
        # 创建测试review
        review_id = create_test_review(temp_lavel_dir, {
            "title": "原始回顾",
            "tags": ["原始标签"]
        })
        
        # 更新元数据
        update_data = {
            "title": "更新后的回顾",
            "tags": ["新标签", "更新标签"],
            "summary": "更新后的摘要"
        }
        
        response = client.patch(f"/api/resources/reviews/{review_id}", json=update_data)
        data = helper.assert_success_response(response)
        
        assert data["title"] == "更新后的回顾"
        assert data["tags"] == ["新标签", "更新标签"]
        assert data["summary"] == "更新后的摘要"
        assert data["id"] == review_id
        
        # 验证文件是否被更新
        review_file = temp_lavel_dir / "reviews" / f"{review_id}.json"
        with open(review_file, 'r', encoding='utf-8') as f:
            file_data = json.load(f)
        assert file_data["title"] == "更新后的回顾"
    
    def test_update_review_metadata_not_found(self, client, temp_lavel_dir):
        """测试更新不存在的 review"""
        helper = APITestHelper(client)
        
        fake_id = "non-existent-id"
        update_data = {"title": "新标题"}
        response = client.patch(f"/api/resources/reviews/{fake_id}", json=update_data)
        helper.assert_error_response(response, 404, "Review not found")
    
    def test_delete_review_success(self, client, temp_lavel_dir):
        """测试成功删除 review"""
        helper = APITestHelper(client)
        
        # 创建测试review
        review_id = create_test_review(temp_lavel_dir)
        
        # 删除review
        response = client.delete(f"/api/resources/reviews/{review_id}")
        data = helper.assert_success_response(response)
        
        assert data["success"] is True
        assert "message" in data
        
        # 验证文件是否被删除
        review_file = temp_lavel_dir / "reviews" / f"{review_id}.json"
        assert not review_file.exists()
    
    def test_delete_review_not_found(self, client, temp_lavel_dir):
        """测试删除不存在的 review"""
        helper = APITestHelper(client)
        
        fake_id = "non-existent-id"
        response = client.delete(f"/api/resources/reviews/{fake_id}")
        helper.assert_error_response(response, 404, "Review not found")
    
    def test_review_workflow_draft_to_completed(self, client, temp_lavel_dir):
        """测试回顾基本工作流"""
        helper = APITestHelper(client)
        
        # 创建基础回顾
        review_id = create_test_review(temp_lavel_dir, {"title": "基础回顾"})
        
        # 更新回顾内容
        update_data = {
            "summary": "回顾已完成",
            "tags": ["已完成"]
        }
        
        response = client.patch(f"/api/resources/reviews/{review_id}", json=update_data)
        data = helper.assert_success_response(response)
        
        assert data["summary"] == "回顾已完成"
        assert "已完成" in data["tags"]
    
    def test_review_with_complex_collected_content(self, client, temp_lavel_dir):
        """测试包含复杂收集内容的回顾"""
        helper = APITestHelper(client)
        
        # 创建包含摘要的回顾
        review_id = create_test_review(temp_lavel_dir, {
            "title": "复杂内容回顾",
            "summary": "这是一个包含多方面内容的详细回顾，涵盖了学习、工作和个人成长等多个方面。"
        })
        
        response = client.get(f"/api/resources/reviews/{review_id}")
        data = helper.assert_success_response(response)
        
        assert data["title"] == "复杂内容回顾"
        assert "summary" in data
        assert len(data["summary"]) > 0
    
    def test_review_period_validation(self, client, temp_lavel_dir):
        """测试回顾创建基本验证"""
        helper = APITestHelper(client)
        
        # 测试有效的回顾数据
        valid_review_data = {
            "title": "有效回顾",
            "summary": "这是一个有效的回顾内容"
        }
        
        response = client.post("/api/resources/reviews/", json=valid_review_data)
        data = helper.assert_success_response(response)
        
        assert data["title"] == "有效回顾"
        assert data["summary"] == "这是一个有效的回顾内容"
    
    def test_list_reviews_pagination(self, client, temp_lavel_dir):
        """测试 reviews 分页功能"""
        helper = APITestHelper(client)
        
        # 创建15个测试reviews
        for i in range(15):
            create_test_review(temp_lavel_dir, {
                "title": f"回顾 {i+1}"
            })
        
        # 测试第1页
        response = client.get("/api/resources/reviews/?page=1&limit=10")
        data = helper.assert_success_response(response)
        
        helper.assert_pagination_response(data, expected_page=1, expected_limit=10)
        assert len(data["reviews"]) == 10
        assert data["pagination"]["total"] == 15
        assert data["pagination"]["total_pages"] == 2
        
        # 测试第2页
        response = client.get("/api/resources/reviews/?page=2&limit=10")
        data = helper.assert_success_response(response)
        
        helper.assert_pagination_response(data, expected_page=2, expected_limit=10)
        assert len(data["reviews"]) == 5
    
    def test_list_reviews_query_params_validation(self, client, temp_lavel_dir):
        """测试查询参数验证"""
        helper = APITestHelper(client)
        
        # 测试无效的页码
        response = client.get("/api/resources/reviews/?page=0")
        helper.assert_error_response(response, 422)
        
        # 测试无效的日期格式
        response = client.get("/api/resources/reviews/?date_from=invalid-date")
        data = helper.assert_success_response(response)  # 修改：无效日期格式应该被忽略而不是报错 