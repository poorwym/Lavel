/**
 * @lavel/block - Block 核心模块
 * 
 * 提供 Lavel 项目中 block（最小编辑单元）的完整功能：
 * - 类型安全的数据模型
 * - 与后端 API 通信
 * - 业务逻辑封装
 * - 命令系统集成
 * - 撤销/重做支持
 * 
 * @example
 * ```typescript
 * import { blockService, blockCommands, registerBlockCommands } from '@lavel/block';
 * 
 * // 使用服务层
 * const blocks = await blockService.listBlocks({ page: 1, limit: 10 });
 * const newBlock = await blockService.createBlock({ content: 'Hello World' });
 * 
 * // 注册命令
 * registerBlockCommands(commandSystem);
 * 
 * // 执行命令
 * await commandSystem.execute('block:create', { content: 'Hello World' });
 * ```
 */

// ============ 数据模型导出 ============
export type {
  // 基础模型
  Block,
  
  // 请求模型
  CreateBlockRequest,
  UpdateBlockRequest,
  ReplaceBlockRequest,
  MoveBlockRequest,
  ListBlocksParams,
  
  // 响应模型
  BlockResponse,
  BlockListResponse,
  BlockChildrenResponse,
  BlockSiblingsResponse,
  MoveBlockResponse,
  DeleteBlockResponse,
  PaginationInfo,
  
  // 工具类型
  ApiError
} from './model/block.model';

// ============ API 层导出 ============
export {
  // API 客户端
  BlockApi,
  createBlockApi,
  blockApi,
  
  // 错误类
  BlockApiError,
  
  // 配置类型
  type ApiConfig
} from './api/block.api';

// ============ 服务层导出 ============
export {
  // 服务类
  BlockService,
  createBlockService,
  blockService,
  
  // 错误类
  BlockServiceError,
  
  // 配置类型
  type BlockServiceConfig,
  type BlockValidationRules
} from './service/block.service';

// ============ 命令层导出 ============
export {
  // 查询命令
  ListBlocksCommand,
  GetBlockCommand,
  GetBlockChildrenCommand,
  GetBlockSiblingsCommand,
  GetBlockTreeCommand,
  
  // 修改命令（支持撤销）
  CreateBlockCommand,
  UpdateBlockCommand,
  ReplaceBlockCommand,
  DeleteBlockCommand,
  MoveBlockCommand,
  CreateBlocksCommand,
  
  // 工具函数
  registerBlockCommands,
  getBlockCommand,
  getUndoableBlockCommands,
  
  // 命令集合
  blockCommands
} from './command/block.commands';

// ============ 便捷导出 ============

/**
 * 快速初始化 block 模块
 * 
 * @param commandSystem 命令系统实例
 * @param apiConfig API 配置
 * @param serviceConfig 服务配置
 * @param validationRules 验证规则
 * 
 * @example
 * ```typescript
 * import { initializeBlockModule } from '@lavel/block';
 * 
 * const { service, api } = initializeBlockModule(commandSystem, {
 *   baseUrl: 'http://localhost:8000',
 *   timeout: 5000
 * });
 * ```
 */
export function initializeBlockModule(
  commandSystem: any,
  apiConfig?: Partial<import('./api/block.api').ApiConfig>,
  serviceConfig?: Partial<import('./service/block.service').BlockServiceConfig>,
  validationRules?: Partial<import('./service/block.service').BlockValidationRules>
) {
  // 创建 API 客户端
  const api = apiConfig 
    ? createBlockApi(apiConfig)
    : blockApi;

  // 创建服务实例
  const service = createBlockService(
    { api, ...serviceConfig },
    validationRules
  );

  // 注册命令
  registerBlockCommands(commandSystem);

  return {
    api,
    service,
    commandSystem
  };
}

/**
 * 模块版本信息
 */
export const version = '1.0.0';

/**
 * 模块元信息
 */
export const moduleInfo = {
  name: '@lavel/block',
  version,
  description: 'Lavel Block 核心模块 - 最小编辑单元管理',
  features: [
    'TypeScript 类型安全',
    'RESTful API 封装',
    '业务逻辑验证',
    '命令系统集成',
    '撤销/重做支持',
    '完整的测试覆盖'
  ],
  dependencies: [
    '@lavel/command-system',
    '@lavel/undo-system'
  ]
};

// ============ 默认导出 ============

/**
 * 默认导出包含最常用的功能
 */
export default {
  // 服务实例
  service: blockService,
  api: blockApi,
  
  // 初始化函数
  initialize: initializeBlockModule,
  
  // 命令注册
  registerCommands: registerBlockCommands,
  
  // 模块信息
  version,
  moduleInfo
};

// ============ 内部类型扩展（仅用于类型推导）============

declare global {
  namespace LavelBlock {
    interface BlockModule {
      service: typeof blockService;
      api: typeof blockApi;
      commands: typeof blockCommands;
      version: typeof version;
    }
  }
} 