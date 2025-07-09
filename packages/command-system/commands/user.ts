/**
 * 用户管理命令集合
 */

import { ICommand, ICommandContext, ICommandResult } from '../types';

// 模拟用户数据存储
const users = new Map<string, {
  id: string;
  username: string;
  email: string;
  role: string;
  createdAt: number;
  lastLogin?: number;
}>();

/**
 * 创建用户命令
 */
export const createUserCommand: ICommand = {
  name: 'user:create',
  description: '创建新用户',
  category: 'user',
  requireAuth: true,
  permissions: ['user:create', 'admin'],
  parameters: [
    {
      name: 'username',
      description: '用户名',
      type: 'string',
      required: true,
      validation: {
        min: 3,
        max: 20,
        pattern: /^[a-zA-Z0-9_]+$/
      }
    },
    {
      name: 'email',
      description: '邮箱地址',
      type: 'string',
      required: true,
      validation: {
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      }
    },
    {
      name: 'role',
      description: '用户角色',
      type: 'string',
      required: false,
      defaultValue: 'user',
      validation: {
        enum: ['admin', 'user', 'guest']
      }
    }
  ],
  execute: async (context: ICommandContext): Promise<ICommandResult> => {
    const { username, email, role } = context.args;
    
    // 检查用户名是否已存在
    for (const user of users.values()) {
      if (user.username === username) {
        return {
          success: false,
          error: `用户名 '${username}' 已存在`
        };
      }
      if (user.email === email) {
        return {
          success: false,
          error: `邮箱 '${email}' 已被使用`
        };
      }
    }
    
    const userId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const newUser = {
      id: userId,
      username,
      email,
      role,
      createdAt: Date.now()
    };
    
    users.set(userId, newUser);
    
    return {
      success: true,
      data: {
        user: newUser,
        message: `用户 '${username}' 创建成功`
      },
      metadata: {
        createdBy: context.user?.id,
        totalUsers: users.size
      }
    };
  }
};

/**
 * 获取用户信息命令
 */
export const getUserCommand: ICommand = {
  name: 'user:get',
  description: '获取用户信息',
  category: 'user',
  requireAuth: true,
  permissions: ['user:read', 'admin'],
  aliases: ['user:info'],
  parameters: [
    {
      name: 'userId',
      description: '用户ID（可选，不提供则获取当前用户信息）',
      type: 'string',
      required: false
    }
  ],
  execute: async (context: ICommandContext): Promise<ICommandResult> => {
    const { userId } = context.args;
    const targetUserId = userId || context.user?.id;
    
    if (!targetUserId) {
      return {
        success: false,
        error: '未指定用户ID且当前用户未登录'
      };
    }
    
    const user = users.get(targetUserId);
    if (!user) {
      return {
        success: false,
        error: `用户 '${targetUserId}' 不存在`
      };
    }
    
    // 如果查询其他用户信息，需要管理员权限
    if (userId && userId !== context.user?.id) {
      if (!context.user?.permissions.includes('admin')) {
        return {
          success: false,
          error: '权限不足，无法查看其他用户信息'
        };
      }
    }
    
    return {
      success: true,
      data: {
        user: user,
        isCurrentUser: targetUserId === context.user?.id
      }
    };
  }
};

/**
 * 列出所有用户命令
 */
export const listUsersCommand: ICommand = {
  name: 'user:list',
  description: '列出所有用户',
  category: 'user',
  requireAuth: true,
  permissions: ['user:list', 'admin'],
  parameters: [
    {
      name: 'page',
      description: '页码',
      type: 'number',
      required: false,
      defaultValue: 1,
      validation: {
        min: 1
      }
    },
    {
      name: 'pageSize',
      description: '每页数量',
      type: 'number',
      required: false,
      defaultValue: 10,
      validation: {
        min: 1,
        max: 100
      }
    },
    {
      name: 'role',
      description: '按角色筛选',
      type: 'string',
      required: false,
      validation: {
        enum: ['admin', 'user', 'guest']
      }
    }
  ],
  execute: async (context: ICommandContext): Promise<ICommandResult> => {
    const { page, pageSize, role } = context.args;
    
    let userList = Array.from(users.values());
    
    // 按角色筛选
    if (role) {
      userList = userList.filter(user => user.role === role);
    }
    
    // 分页
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedUsers = userList.slice(startIndex, endIndex);
    
    return {
      success: true,
      data: {
        users: paginatedUsers,
        pagination: {
          page,
          pageSize,
          total: userList.length,
          totalPages: Math.ceil(userList.length / pageSize)
        },
        filters: {
          role: role || null
        }
      }
    };
  }
};

/**
 * 更新用户信息命令
 */
export const updateUserCommand: ICommand = {
  name: 'user:update',
  description: '更新用户信息',
  category: 'user',
  requireAuth: true,
  permissions: ['user:update', 'admin'],
  parameters: [
    {
      name: 'userId',
      description: '用户ID',
      type: 'string',
      required: true
    },
    {
      name: 'updates',
      description: '要更新的字段',
      type: 'object',
      required: true
    }
  ],
  validate: async (context: ICommandContext): Promise<boolean> => {
    const { userId, updates } = context.args;
    
    // 验证updates对象的字段
    const allowedFields = ['username', 'email', 'role'];
    const updateFields = Object.keys(updates);
    
    for (const field of updateFields) {
      if (!allowedFields.includes(field)) {
        return false;
      }
    }
    
    // 用户只能更新自己的信息，管理员可以更新任何人的信息
    if (userId !== context.user?.id && !context.user?.permissions.includes('admin')) {
      return false;
    }
    
    return true;
  },
  execute: async (context: ICommandContext): Promise<ICommandResult> => {
    const { userId, updates } = context.args;
    
    const user = users.get(userId);
    if (!user) {
      return {
        success: false,
        error: `用户 '${userId}' 不存在`
      };
    }
    
    // 检查用户名和邮箱的唯一性
    if (updates.username || updates.email) {
      for (const [id, existingUser] of users) {
        if (id === userId) continue; // 跳过当前用户
        
        if (updates.username && existingUser.username === updates.username) {
          return {
            success: false,
            error: `用户名 '${updates.username}' 已存在`
          };
        }
        
        if (updates.email && existingUser.email === updates.email) {
          return {
            success: false,
            error: `邮箱 '${updates.email}' 已被使用`
          };
        }
      }
    }
    
    // 执行更新
    const updatedUser = { ...user, ...updates };
    users.set(userId, updatedUser);
    
    return {
      success: true,
      data: {
        user: updatedUser,
        updatedFields: Object.keys(updates),
        message: `用户 '${user.username}' 更新成功`
      },
      metadata: {
        updatedBy: context.user?.id,
        updatedAt: Date.now()
      }
    };
  }
};

/**
 * 删除用户命令
 */
export const deleteUserCommand: ICommand = {
  name: 'user:delete',
  description: '删除用户',
  category: 'user',
  requireAuth: true,
  permissions: ['user:delete', 'admin'],
  parameters: [
    {
      name: 'userId',
      description: '用户ID',
      type: 'string',
      required: true
    },
    {
      name: 'confirm',
      description: '确认删除（必须为 true）',
      type: 'boolean',
      required: true
    }
  ],
  validate: async (context: ICommandContext): Promise<boolean> => {
    const { userId, confirm } = context.args;
    
    // 必须确认删除
    if (!confirm) {
      return false;
    }
    
    // 不能删除自己
    if (userId === context.user?.id) {
      return false;
    }
    
    return true;
  },
  execute: async (context: ICommandContext): Promise<ICommandResult> => {
    const { userId, confirm } = context.args;
    
    if (!confirm) {
      return {
        success: false,
        error: '必须确认删除操作'
      };
    }
    
    if (userId === context.user?.id) {
      return {
        success: false,
        error: '不能删除自己的账户'
      };
    }
    
    const user = users.get(userId);
    if (!user) {
      return {
        success: false,
        error: `用户 '${userId}' 不存在`
      };
    }
    
    users.delete(userId);
    
    return {
      success: true,
      data: {
        deletedUser: user,
        message: `用户 '${user.username}' 已被删除`
      },
      metadata: {
        deletedBy: context.user?.id,
        deletedAt: Date.now(),
        remainingUsers: users.size
      }
    };
  }
};

/**
 * 用户登录记录命令
 */
export const userLoginCommand: ICommand = {
  name: 'user:login',
  description: '记录用户登录',
  category: 'user',
  parameters: [
    {
      name: 'userId',
      description: '用户ID',
      type: 'string',
      required: true
    }
  ],
  execute: async (context: ICommandContext): Promise<ICommandResult> => {
    const { userId } = context.args;
    
    const user = users.get(userId);
    if (!user) {
      return {
        success: false,
        error: `用户 '${userId}' 不存在`
      };
    }
    
    // 更新最后登录时间
    user.lastLogin = Date.now();
    users.set(userId, user);
    
    return {
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          lastLogin: user.lastLogin
        },
        message: `用户 '${user.username}' 登录成功`
      }
    };
  }
};

// 导出所有用户管理命令
export const userCommands: ICommand[] = [
  createUserCommand,
  getUserCommand,
  listUsersCommand,
  updateUserCommand,
  deleteUserCommand,
  userLoginCommand
]; 