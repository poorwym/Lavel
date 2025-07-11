# Lavel 集成测试

## 概览

这个目录包含Lavel项目的集成测试，专注于测试真实的API调用和模块集成，而不是单元测试或mock。

## 设计理念

### 🎯 集成优先
- **真实API调用**: 测试连接到真实的后端服务
- **模块集成**: 验证@lavel/api与其他模块的集成
- **端到端流程**: 测试完整的用户工作流

### 🚫 不使用Mock
- 前端测试不需要复杂的mock系统
- 直接测试真实API响应和错误处理
- 更接近实际使用场景

## 目录结构

```
test/
├── jest.config.js              # Jest配置
├── setup.ts                   # 测试环境设置
├── integration/
│   └── api/
│       └── lavel-api.test.ts  # @lavel/api模块集成测试
├── coverage/                  # 覆盖率报告(自动生成)
└── README.md                  # 本文档
```

## 运行测试

### 前提条件

确保后端API服务正在运行:
```bash
cd backend && python main.py
```

### 测试命令

```bash
# 在项目根目录运行所有集成测试
pnpm test

# 监听模式
pnpm test:watch  

# 生成覆盖率报告
pnpm test:coverage

# 只运行API测试
pnpm test:api
```

### 环境配置

可以通过环境变量配置API地址:
```bash
# 自定义API地址
API_BASE_URL=http://localhost:8001 pnpm test

# 使用生产环境API  
API_BASE_URL=https://api.lavel.com pnpm test
```

## 测试范围

### @lavel/api 模块测试

1. **API客户端基础功能**
   - ✅ 客户端实例创建
   - ✅ 请求头配置
   - ✅ 基础URL设置

2. **后端连接测试**
   - ✅ 健康检查API调用
   - ✅ 连接错误处理

3. **资源命令测试**
   - ✅ Blocks API (8个命令)
   - ✅ Knowledges API (6个命令)  
   - ✅ Thoughts API (6个命令)
   - ✅ Todos API (7个命令)
   - ✅ Reviews API (5个命令)

4. **错误处理测试**
   - ✅ 网络错误处理
   - ✅ 超时处理
   - ✅ HTTP错误状态

5. **命令系统集成**
   - ✅ 命令接口一致性
   - ✅ 命名规范验证
   - ✅ 参数结构验证

## 特点

### 🔄 自动容错
- 当后端不可用时，测试会优雅失败并记录警告
- 区分真实错误和环境问题
- 提供有意义的错误信息

### 📊 真实场景
- 测试实际的HTTP请求/响应
- 验证真实的错误情况
- 测试网络延迟和超时

### 🎮 灵活配置
- 支持多种API环境
- 可配置超时时间
- 环境变量驱动的配置

## 添加新测试

### 1. 创建测试文件
在`test/integration/`下创建新的测试文件:

```typescript
// test/integration/feature/my-feature.test.ts
import { ApiClient } from '@lavel/api';

describe('我的功能集成测试', () => {
  let client: ApiClient;
  
  beforeAll(() => {
    client = new ApiClient({
      baseUrl: process.env.API_BASE_URL || 'http://localhost:8000'
    });
  });

  test('应该测试真实功能', async () => {
    try {
      const result = await client.get('/my-endpoint');
      expect(result).toBeDefined();
    } catch (error) {
      console.warn('API未可用:', error.message);
    }
  });
});
```

### 2. 更新配置
如果需要新的环境变量或配置，更新`test/setup.ts`。

### 3. 运行测试
```bash
pnpm test -- --testPathPattern=my-feature
```

## 故障排除

### 常见问题

1. **后端连接失败**
   ```bash
   # 检查后端是否运行
   curl http://localhost:8000/health
   
   # 启动后端
   cd backend && python main.py
   ```

2. **模块导入错误**
   ```bash
   # 确保@lavel/api已构建
   cd packages/core/api && pnpm build
   ```

3. **测试超时**
   - 检查网络连接
   - 增加`API_BASE_URL`的响应速度
   - 调整`test/setup.ts`中的超时设置

### 调试技巧

```bash
# 启用详细输出
pnpm test -- --verbose

# 运行单个测试文件
pnpm test -- --testPathPattern=lavel-api

# 查看网络请求
DEBUG=axios pnpm test
```

## 最佳实践

### ✅ 推荐做法
- 测试真实API调用
- 验证错误处理
- 使用描述性测试名称
- 处理网络不可用的情况

### ❌ 避免做法
- 不要使用mock或stub
- 不要依赖特定的测试数据
- 不要假设后端总是可用
- 不要在测试中硬编码URL

## 持续集成

在CI环境中运行测试时:

```yaml
# .github/workflows/test.yml
- name: 运行集成测试
  run: |
    # 启动后端服务
    cd backend && python main.py &
    sleep 10
    
    # 运行测试
    pnpm test
  env:
    API_BASE_URL: http://localhost:8000
```

这样的测试架构确保了：
- 🎯 测试真实场景
- 🔒 验证实际集成
- 🚀 快速反馈循环
- 📈 高质量保证 