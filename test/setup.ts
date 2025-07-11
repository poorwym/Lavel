/**
 * 集成测试环境设置
 */

// 设置环境变量
if (!process.env.NODE_ENV) {
  Object.defineProperty(process.env, 'NODE_ENV', {
    value: 'test',
    writable: true
  });
}

if (!process.env.API_BASE_URL) {
  process.env.API_BASE_URL = 'http://localhost:8000';
}

// 全局测试配置
(global as any).testConfig = {
  apiBaseUrl: process.env.API_BASE_URL,
  timeout: 15000,
  retryAttempts: 3
};

// 增加超时时间以适应网络请求
jest.setTimeout(15000);

console.log('🧪 集成测试环境已初始化');
console.log(`📡 API Base URL: ${process.env.API_BASE_URL}`);
console.log(`⏰ 测试超时时间: 15秒`); 