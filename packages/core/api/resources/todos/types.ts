/**
 * Todos 资源类型定义
 */

export interface TaskNode {
  id: string;
  content: string;
  status: 'pending' | 'done';
  depends_on: string[];
  tags: string[];
  root_block_id: string;
  created_at: string;
  updated_at: string;
}

export interface Todo {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'done' | 'archived';
  tags: string[];
  root_block_id: string;
  due_at?: string;
  subtasks: TaskNode[];
  linked_knowledge: string[];
  dependencies: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateTodoRequest {
  id?: string;
  title: string;
  description?: string;
  due_date?: string;
  tags?: string[];
  auto_expand?: boolean;
  expand_prompt?: string;
  linked_knowledge?: string[];
}

export interface UpdateTodoMetadataRequest {
  title?: string;
  description?: string;
  due_date?: string;
  tags?: string[];
  linked_knowledge?: string[];
}

export interface UpdateTodoStatusRequest {
  status: 'pending' | 'in_progress' | 'done' | 'archived';
  completion_note?: string;
  actual_completion_date?: string;
}

export interface UpdateSubtaskStatusRequest {
  status: 'pending' | 'done';
}

export interface AddSubtaskRequest {
  id?: string;
  content?: string;
  title?: string;
  description?: string;
  dependencies?: string[];
  depends_on?: string[];
  tags?: string[];
  root_block_id?: string;
}

export interface TaskNodeResponse {
  id: string;
  content: string;
  status: 'pending' | 'done';
  depends_on: string[];
  tags: string[];
  root_block_id: string;
  created_at: string;
  updated_at: string;
}

export interface TodoResponse {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'done' | 'archived';
  tags: string[];
  root_block_id: string;
  due_at?: string;
  subtasks: TaskNodeResponse[];
  linked_knowledge: string[];
  dependencies: string[];
  created_at: string;
  updated_at: string;
}

export interface SubtasksStatsResponse {
  total: number;
  completed: number;
  pending: number;
}

export interface TodoWithStatsResponse {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'done' | 'archived';
  tags: string[];
  root_block_id: string;
  due_at?: string;
  subtasks: TaskNodeResponse[];
  linked_knowledge: string[];
  dependencies: string[];
  created_at: string;
  updated_at: string;
  subtasks_stats: SubtasksStatsResponse;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface TodoListResponse {
  todos: TodoWithStatsResponse[];
  pagination: PaginationInfo;
}

export interface DAGNodeInfo {
  id: string;
  label: string;
  status: string;
}

export interface DAGEdgeInfo {
  from: string;
  to: string;
}

export interface DAGInfo {
  nodes: DAGNodeInfo[];
  edges: DAGEdgeInfo[];
  has_cycles: boolean;
}

export interface SubtasksStatistics {
  total: number;
  completed: number;
  pending: number;
  completion_rate: number;
}

export interface TodoSubtasksResponse {
  subtasks: TaskNodeResponse[];
  dag_info: DAGInfo;
  statistics: SubtasksStatistics;
}

export interface UpdateTodoStatusResponse {
  success: boolean;
  updated_todo: TodoResponse;
  status_change: string;
  cascade_updates: string[];
}

export interface UpdateSubtaskStatusResponse {
  success: boolean;
  updated_subtask: any;
  subtask_update: string;
  parent_status_update?: string;
  todo: TodoResponse;
}

export interface AddSubtaskResponse {
  success: boolean;
  subtask: TaskNodeResponse;
  todo: TodoResponse;
}

export interface DeleteTodoResponse {
  success: boolean;
  message: string;
}

export interface TodoSearchResultItem {
  todo: TodoResponse;
  score: number;
}

export interface TodoSearchResponse {
  results: TodoSearchResultItem[];
}

export interface TodoListParams {
  page?: number;
  limit?: number;
  tags?: string;
  status?: string;
  search?: string;
} 