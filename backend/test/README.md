# Lavel Backend API 测试

这个目录包含了 Lavel 后端 API 的完整单元测试套件。

## 测试结构

```
test/
├── __init__.py                 # 测试模块初始化
├── conftest.py                 # pytest 配置和共享 fixtures
├── utils.py                    # 测试工具函数
├── test_blocks_api.py          # Blocks API 测试
├── test_knowledges_api.py      # Knowledges API 测试
├── test_thoughts_api.py        # Thoughts API 测试
├── test_todos_api.py           # Todos API 测试
├── test_reviews_api.py         # Reviews API 测试
└── README.md                   # 本文档
```

## 测试覆盖范围

### Blocks API (`test_blocks_api.py`)
- ✅ 列出 blocks（分页、筛选）
- ✅ 创建 block
- ✅ 获取单个 block
- ✅ 更新 block（部分更新和完全替换）
- ✅ 删除 block
- ✅ 获取子 blocks 和兄弟 blocks
- ✅ 移动 block 位置
- ✅ 参数验证

### Knowledges API (`test_knowledges_api.py`)
- ✅ 列出 knowledges（分页、标签筛选、搜索）
- ✅ 创建 knowledge
- ✅ 获取单个 knowledge
- ✅ 更新 knowledge 元数据
- ✅ 删除 knowledge
- ✅ 导出为 Markdown
- ✅ 获取反向链接
- ✅ 链接 block 到 knowledge
- ✅ 搜索 knowledges

### Thoughts API (`test_thoughts_api.py`)
- ✅ 列出 thoughts（分页、标签筛选、搜索、日期范围）
- ✅ 创建 thought
- ✅ 获取单个 thought
- ✅ 更新 thought
- ✅ 删除 thought
- ✅ 升级 thought 为 knowledge
- ✅ 搜索 thoughts
- ✅ 心情和优先级管理

### Todos API (`test_todos_api.py`)
- ✅ 列出 todos（分页、状态筛选、优先级筛选、截止日期）
- ✅ 创建 todo（包括自动展开子任务）
- ✅ 获取单个 todo
- ✅ 更新 todo 元数据和状态
- ✅ 删除 todo
- ✅ 子任务管理（获取、添加、更新状态）
- ✅ 搜索 todos
- ✅ 依赖关系管理

### Reviews API (`test_reviews_api.py`)
- ✅ 列出 reviews（分页、类型筛选、状态筛选、日期范围）
- ✅ 创建 review（包括自动收集内容）
- ✅ 获取单个 review
- ✅ 更新 review 元数据
- ✅ 删除 review
- ✅ 不同类型的回顾（daily, weekly, monthly, project, ad_hoc）
- ✅ 复杂收集内容处理

## 测试特性

### 自动化 Mock
- 🔧 LLM 服务 Mock（自动展开任务、升级想法、收集回顾内容）
- 🔧 临时文件系统（隔离测试环境）
- 🔧 固定时间 Mock（确保测试一致性）

### 数据验证
- ✅ 响应数据结构验证
- ✅ 分页信息验证
- ✅ 错误响应验证
- ✅ 文件系统状态验证

### 边界条件测试
- ❌ 404 错误处理
- ❌ 422 参数验证错误
- ❌ 空数据集处理
- ❌ 大数据集分页
- ❌ 无效参数处理

## 运行测试

### 安装测试依赖

```bash
cd backend
uv pip install -e ".[test]"
```

### 运行所有测试

```bash
# 运行所有测试
pytest

# 运行特定模块测试
pytest test/test_blocks_api.py

# 运行特定测试方法
pytest test/test_blocks_api.py::TestBlocksAPI::test_create_block_success

# 运行并生成覆盖率报告
pytest --cov=api --cov=service --cov=schemas --cov-report=html
```

### 测试选项

```bash
# 详细输出
pytest -v

# 显示打印信息
pytest -s

# 停在第一个失败
pytest -x

# 并行运行（需要安装 pytest-xdist）
pytest -n auto
```

## 测试配置

测试配置位于 `conftest.py` 中，包括：

- **临时目录**：每个测试使用隔离的 `.Lavel` 目录
- **测试客户端**：FastAPI TestClient 和 AsyncClient
- **示例数据**：各种测试数据的 fixtures
- **Mock 时间**：固定的测试时间
- **辅助函数**：创建测试文件的便捷函数

## 测试工具

`utils.py` 提供了丰富的测试工具：

- **APITestHelper**：API 响应断言帮助类
- **MockLLMService**：LLM 服务模拟
- **数据结构验证**：验证各种 API 响应格式
- **测试数据生成**：批量创建测试数据

## 持续集成

这些测试设计为在 CI/CD 环境中运行：

- ✅ 无外部依赖（使用 Mock）
- ✅ 快速执行（平均 < 30 秒）
- ✅ 确定性结果（无随机性）
- ✅ 清理资源（临时文件自动清理）

## 代码覆盖率

目标覆盖率指标：
- API 路由：> 95%
- Service 层：> 90%
- Schema 验证：> 95%

查看覆盖率报告：
```bash
pytest --cov=api --cov=service --cov=schemas --cov-report=html
open htmlcov/index.html
```

## 开发指南

### 添加新测试

1. 在相应的测试文件中添加测试方法
2. 使用 `APITestHelper` 进行响应验证
3. 使用 `temp_lavel_dir` fixture 确保文件隔离
4. 为复杂功能添加 Mock

### 测试命名规范

```python
def test_{action}_{scenario}(self, client, temp_lavel_dir):
    """测试{具体功能描述}"""
    pass
```

### 断言模式

```python
# 成功响应
data = helper.assert_success_response(response)

# 错误响应
helper.assert_error_response(response, 404, "Not found")

# 分页响应
helper.assert_pagination_response(data)

# 数据结构
assert_block_structure(data)
``` 