"""
Blocks API 单元测试

测试 blocks 相关的所有 API 端点功能
"""

import json
import pytest
from unittest.mock import patch
from test.conftest import create_test_block
from test.utils import (
    APITestHelper, create_sample_blocks_chain, create_hierarchical_blocks,
    assert_block_structure
)


class TestBlocksAPI:
    """Blocks API 测试类"""
    
    def setup_method(self):
        """每个测试方法执行前的设置"""
        pass
    
    def test_list_blocks_empty(self, client, temp_lavel_dir):
        """测试列出空的 blocks 列表"""
        helper = APITestHelper(client)
        
        response = client.get("/api/resources/blocks/")
        data = helper.assert_success_response(response)
        
        helper.assert_pagination_response(data)
        assert data["blocks"] == []
        assert data["pagination"]["total"] == 0
    
    def test_list_blocks_with_data(self, client, temp_lavel_dir):
        """测试列出有数据的 blocks 列表"""
        helper = APITestHelper(client)
        
        # 创建测试数据
        block_ids = create_sample_blocks_chain(temp_lavel_dir, 5)
        
        response = client.get("/api/resources/blocks/")
        data = helper.assert_success_response(response)
        
        helper.assert_pagination_response(data)
        assert len(data["blocks"]) == 5
        assert data["pagination"]["total"] == 5
        
        # 验证每个block的数据结构
        for block in data["blocks"]:
            assert_block_structure(block)
    
    def test_list_blocks_pagination(self, client, temp_lavel_dir):
        """测试 blocks 分页功能"""
        helper = APITestHelper(client)
        
        # 创建25个测试blocks
        block_ids = []
        for i in range(25):
            block_id = create_test_block(temp_lavel_dir, {"content": f"Block {i+1}"})
            block_ids.append(block_id)
        
        # 测试第1页
        response = client.get("/api/resources/blocks/?page=1&limit=10")
        data = helper.assert_success_response(response)
        
        helper.assert_pagination_response(data, expected_page=1, expected_limit=10)
        assert len(data["blocks"]) == 10
        assert data["pagination"]["total"] == 25
        assert data["pagination"]["total_pages"] == 3
        
        # 测试第2页
        response = client.get("/api/resources/blocks/?page=2&limit=10")
        data = helper.assert_success_response(response)
        
        helper.assert_pagination_response(data, expected_page=2, expected_limit=10)
        assert len(data["blocks"]) == 10
        
        # 测试第3页
        response = client.get("/api/resources/blocks/?page=3&limit=10")
        data = helper.assert_success_response(response)
        
        helper.assert_pagination_response(data, expected_page=3, expected_limit=10)
        assert len(data["blocks"]) == 5
    
    def test_list_blocks_filter_by_parent(self, client, temp_lavel_dir):
        """测试按父块ID筛选blocks"""
        helper = APITestHelper(client)
        
        # 创建层级结构的blocks
        root_block_ids = create_hierarchical_blocks(temp_lavel_dir, None, 2, 3)
        parent_id = root_block_ids[0]
        
        response = client.get(f"/api/resources/blocks/?parent_id={parent_id}")
        data = helper.assert_success_response(response)
        
        # 验证所有返回的blocks都有相同的parent_id
        for block in data["blocks"]:
            assert block["parent_id"] == parent_id
    
    def test_create_block_success(self, client, temp_lavel_dir, sample_block_data):
        """测试成功创建 block"""
        helper = APITestHelper(client)
        
        response = client.post("/api/resources/blocks/", json=sample_block_data)
        data = helper.assert_success_response(response, 200)
        
        assert_block_structure(data)
        assert data["content"] == sample_block_data["content"]
        assert "id" in data
        assert "created_at" in data
        assert "updated_at" in data
        
        # 验证文件是否真的被创建
        block_file = temp_lavel_dir / "blocks" / f"{data['id']}.json"
        assert block_file.exists()
    
    def test_create_block_with_parent(self, client, temp_lavel_dir, sample_block_data):
        """测试创建带父块的 block"""
        helper = APITestHelper(client)
        
        # 先创建父块
        parent_id = create_test_block(temp_lavel_dir, {"content": "父块"})
        
        # 创建子块
        sample_block_data["parent_id"] = parent_id
        response = client.post("/api/resources/blocks/", json=sample_block_data)
        data = helper.assert_success_response(response)
        
        assert data["parent_id"] == parent_id
    
    def test_get_block_success(self, client, temp_lavel_dir):
        """测试成功获取 block"""
        helper = APITestHelper(client)
        
        # 创建测试block
        block_id = create_test_block(temp_lavel_dir)
        
        response = client.get(f"/api/resources/blocks/{block_id}")
        data = helper.assert_success_response(response)
        
        assert_block_structure(data)
        assert data["id"] == block_id
    
    def test_get_block_not_found(self, client, temp_lavel_dir):
        """测试获取不存在的 block"""
        helper = APITestHelper(client)
        
        fake_id = "non-existent-id"
        response = client.get(f"/api/resources/blocks/{fake_id}")
        helper.assert_error_response(response, 404, "Block not found")
    
    def test_update_block_success(self, client, temp_lavel_dir):
        """测试成功更新 block"""
        helper = APITestHelper(client)
        
        # 创建测试block
        block_id = create_test_block(temp_lavel_dir, {"content": "原始内容"})
        
        # 更新block
        update_data = {"content": "更新后的内容"}
        response = client.patch(f"/api/resources/blocks/{block_id}", json=update_data)
        data = helper.assert_success_response(response)
        
        assert data["content"] == "更新后的内容"
        assert data["id"] == block_id
        
        # 验证文件是否被更新
        block_file = temp_lavel_dir / "blocks" / f"{block_id}.json"
        with open(block_file, 'r', encoding='utf-8') as f:
            file_data = json.load(f)
        assert file_data["content"] == "更新后的内容"
    
    def test_update_block_not_found(self, client, temp_lavel_dir):
        """测试更新不存在的 block"""
        helper = APITestHelper(client)
        
        fake_id = "non-existent-id"
        update_data = {"content": "更新内容"}
        response = client.patch(f"/api/resources/blocks/{fake_id}", json=update_data)
        helper.assert_error_response(response, 404, "Block not found")
    
    def test_replace_block_success(self, client, temp_lavel_dir):
        """测试成功替换 block"""
        helper = APITestHelper(client)
        
        # 创建测试block
        block_id = create_test_block(temp_lavel_dir, {"content": "原始内容"})
        
        # 替换block
        replace_data = {
            "content": "完全新的内容",
            "parent_id": "new-parent-id",
            "prev_id": None,
            "next_id": None,
            "first_child_id": None
        }
        response = client.put(f"/api/resources/blocks/{block_id}", json=replace_data)
        data = helper.assert_success_response(response)
        
        assert data["content"] == "完全新的内容"
        assert data["parent_id"] == "new-parent-id"
        assert data["id"] == block_id  # ID应该保持不变
    
    def test_replace_block_not_found(self, client, temp_lavel_dir):
        """测试替换不存在的 block"""
        helper = APITestHelper(client)
        
        fake_id = "non-existent-id"
        replace_data = {"content": "新内容"}
        response = client.put(f"/api/resources/blocks/{fake_id}", json=replace_data)
        helper.assert_error_response(response, 404, "Block not found")
    
    def test_delete_block_success(self, client, temp_lavel_dir):
        """测试成功删除 block"""
        helper = APITestHelper(client)
        
        # 创建测试block
        block_id = create_test_block(temp_lavel_dir)
        
        # 删除block
        response = client.delete(f"/api/resources/blocks/{block_id}")
        data = helper.assert_success_response(response)
        
        assert data["success"] is True
        assert "message" in data
        
        # 验证文件是否被删除
        block_file = temp_lavel_dir / "blocks" / f"{block_id}.json"
        assert not block_file.exists()
    
    def test_delete_block_with_children(self, client, temp_lavel_dir):
        """测试删除有子块的 block"""
        helper = APITestHelper(client)
        
        # 创建带子块的层级结构
        block_ids = create_hierarchical_blocks(temp_lavel_dir, None, 2, 2)
        parent_id = block_ids[0]
        
        # 删除父块
        response = client.delete(f"/api/resources/blocks/{parent_id}")
        data = helper.assert_success_response(response)
        
        assert data["success"] is True
        
        # 验证父块文件被删除
        parent_file = temp_lavel_dir / "blocks" / f"{parent_id}.json"
        assert not parent_file.exists()
        
        # 验证子块的parent_id被更新为None
        # (这个测试需要检查子块的实际状态)
    
    def test_delete_block_not_found(self, client, temp_lavel_dir):
        """测试删除不存在的 block"""
        helper = APITestHelper(client)
        
        fake_id = "non-existent-id"
        response = client.delete(f"/api/resources/blocks/{fake_id}")
        helper.assert_error_response(response, 404, "Block not found")
    
    def test_get_block_children_success(self, client, temp_lavel_dir):
        """测试成功获取子块列表"""
        helper = APITestHelper(client)
        
        # 创建层级结构
        block_ids = create_hierarchical_blocks(temp_lavel_dir, None, 2, 3)
        parent_id = block_ids[0]
        
        response = client.get(f"/api/resources/blocks/{parent_id}/children")
        data = helper.assert_success_response(response)
        
        # 现在返回的是包装对象，包含children字段
        assert isinstance(data, dict)
        assert "children" in data
        assert isinstance(data["children"], list)
        
        # 验证返回的都是子块
        for child in data["children"]:
            assert_block_structure(child)
            assert child["parent_id"] == parent_id
    
    def test_get_block_children_parent_not_found(self, client, temp_lavel_dir):
        """测试获取不存在父块的子块"""
        helper = APITestHelper(client)
        
        fake_id = "non-existent-id"
        response = client.get(f"/api/resources/blocks/{fake_id}/children")
        helper.assert_error_response(response, 404, "Parent block not found")
    
    def test_get_block_siblings_success(self, client, temp_lavel_dir):
        """测试成功获取兄弟块列表"""
        helper = APITestHelper(client)
        
        # 创建层级结构
        block_ids = create_hierarchical_blocks(temp_lavel_dir, None, 2, 3)
        # 选择一个有兄弟的块
        test_block_id = block_ids[1]  # 第二个根块
        
        response = client.get(f"/api/resources/blocks/{test_block_id}/siblings")
        data = helper.assert_success_response(response)
        
        # 现在返回的是包装对象，包含siblings字段
        assert isinstance(data, dict)
        assert "siblings" in data
        assert isinstance(data["siblings"], list)
        
        # 验证返回的都是兄弟块（相同父级，不包括自己）
        for sibling in data["siblings"]:
            assert_block_structure(sibling)
            assert sibling["id"] != test_block_id
    
    def test_get_block_siblings_not_found(self, client, temp_lavel_dir):
        """测试获取不存在块的兄弟块"""
        helper = APITestHelper(client)
        
        fake_id = "non-existent-id"
        response = client.get(f"/api/resources/blocks/{fake_id}/siblings")
        helper.assert_error_response(response, 404, "Block not found")
    
    def test_move_block_success(self, client, temp_lavel_dir):
        """测试成功移动 block"""
        helper = APITestHelper(client)
        
        # 创建测试blocks
        block_ids = create_sample_blocks_chain(temp_lavel_dir, 3)
        block_to_move = block_ids[1]  # 移动中间的块
        
        # 移动到新位置
        move_data = {
            "parent_id": None,
            "prev_id": block_ids[2],  # 移动到最后
            "next_id": None
        }
        
        response = client.post(f"/api/resources/blocks/{block_to_move}/move", json=move_data)
        data = helper.assert_success_response(response)
        
        assert data["success"] is True
        assert "block" in data
        assert data["block"]["id"] == block_to_move
        assert data["block"]["prev_id"] == block_ids[2]
    
    def test_move_block_not_found(self, client, temp_lavel_dir):
        """测试移动不存在的 block"""
        helper = APITestHelper(client)
        
        fake_id = "non-existent-id"
        move_data = {"parent_id": None}
        response = client.post(f"/api/resources/blocks/{fake_id}/move", json=move_data)
        helper.assert_error_response(response, 404, "Block not found")
    
    def test_move_block_change_parent(self, client, temp_lavel_dir):
        """测试移动 block 到新父级"""
        helper = APITestHelper(client)
        
        # 创建两个父块和一个子块
        parent1_id = create_test_block(temp_lavel_dir, {"content": "父块1"})
        parent2_id = create_test_block(temp_lavel_dir, {"content": "父块2"})
        child_id = create_test_block(temp_lavel_dir, {
            "content": "子块",
            "parent_id": parent1_id
        })
        
        # 移动子块到新父级
        move_data = {
            "parent_id": parent2_id,
            "prev_id": None,
            "next_id": None
        }
        
        response = client.post(f"/api/resources/blocks/{child_id}/move", json=move_data)
        data = helper.assert_success_response(response)
        
        assert data["success"] is True
        assert data["block"]["parent_id"] == parent2_id
    
    def test_list_blocks_query_params_validation(self, client, temp_lavel_dir):
        """测试查询参数验证"""
        helper = APITestHelper(client)
        
        # 测试无效的页码
        response = client.get("/api/resources/blocks/?page=0")
        helper.assert_error_response(response, 422)  # Validation error
        
        # 测试无效的限制数量
        response = client.get("/api/resources/blocks/?limit=101")
        helper.assert_error_response(response, 422)  # Validation error
        
        # 测试负数限制
        response = client.get("/api/resources/blocks/?limit=-1")
        helper.assert_error_response(response, 422)  # Validation error 