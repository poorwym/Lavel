/**
 * @fileoverview 资源命令统一导出模块
 * 
 * 该模块负责集中管理和导出所有资源模块的命令定义，包括：
 * - Blocks（块）相关命令
 * - Knowledges（知识）相关命令  
 * - Thoughts（思考笔记）相关命令
 * - Todos（任务）相关命令
 * - Reviews（复盘记录）相关命令
 * 
 * 提供统一的命令访问接口，支持按模块导出和全量导出两种方式。
 * 
 * @author Lavel Team
 * @since 1.0.0
 */

import { blocksCommands } from './blocks/commands';
import { knowledgesCommands } from './knowledges/commands';
import { thoughtsCommands } from './thoughts/commands';
import { todosCommands } from './todos/commands';
import { reviewsCommands } from './reviews/commands';

/**
 * 导出各个模块的命令集合
 * 
 * @example
 * ```typescript
 * import { blocksCommands, knowledgesCommands } from './commands';
 * 
 * // 使用特定模块的命令
 * const createBlockCmd = blocksCommands.find(cmd => cmd.name === 'blocks:create');
 * ```
 */
export {
  /** Blocks 模块命令集合 */
  blocksCommands,
  /** Knowledges 模块命令集合 */
  knowledgesCommands,
  /** Thoughts 模块命令集合 */
  thoughtsCommands,
  /** Todos 模块命令集合 */
  todosCommands,
  /** Reviews 模块命令集合 */
  reviewsCommands
};

/**
 * 所有资源命令的合并对象
 * 
 * 将所有模块的命令合并为一个统一的命令对象，便于命令系统进行统一管理和调度。
 * 
 * @example
 * ```typescript
 * import { allCommands } from './commands';
 * 
 * // 获取所有可用命令
 * const commandNames = Object.keys(allCommands);
 * 
 * // 执行特定命令
 * const result = await allCommands['blocks:create'].execute(context);
 * ```
 */
export const allCommands = {
  ...blocksCommands,
  ...knowledgesCommands,
  ...thoughtsCommands,
  ...todosCommands,
  ...reviewsCommands
};

/**
 * 默认导出所有命令的合并对象
 * 
 * @default allCommands
 */
export default allCommands; 