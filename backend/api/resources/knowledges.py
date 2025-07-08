"""
Knowledges API 模块

处理结构化知识文档相关的所有API端点
支持类似Obsidian的链接机制和Markdown导出功能
"""

from fastapi import APIRouter, HTTPException, Query, Response
from typing import Optional

from service.resources import knowledges_service
from schemas.resources.knowledge import (
    CreateKnowledgeRequest,
    UpdateKnowledgeMetadataRequest,
    LinkBlockToKnowledgeRequest,
    KnowledgeResponse,
    KnowledgeListResponse,
    KnowledgeBacklinksResponse,
    LinkBlockToKnowledgeResponse,
    DeleteKnowledgeResponse,
    KnowledgeSearchResponse
)

router = APIRouter()


@router.get("/", response_model=KnowledgeListResponse)
async def list_knowledges(
    page: int = Query(1, ge=1, description="页码"),
    limit: int = Query(20, ge=1, le=100, description="每页数量"),
    tags: Optional[str] = Query(None, description="标签筛选，逗号分隔"),
    search: Optional[str] = Query(None, description="搜索关键词")
):
    """
    列出所有知识文档
    
    支持分页、标签筛选和全文搜索功能
    
    Args:
        page: 页码，从1开始
        limit: 每页返回的知识文档数量
        tags: 标签筛选，多个标签用逗号分隔
        search: 搜索关键词，支持标题和内容搜索
        
    Returns:
        包含知识文档列表和分页信息的响应
    """
    return await knowledges_service.list_knowledges(page, limit, tags, search)


@router.post("/", response_model=KnowledgeResponse)
async def create_knowledge(knowledge_request: CreateKnowledgeRequest):
    """
    新建知识文档
    
    创建一个新的结构化知识文档，自动生成UUID和时间戳
    
    Args:
        knowledge_request: 创建知识文档的请求数据
                       
    Returns:
        创建的知识文档信息，包括生成的ID和时间戳
    """
    return await knowledges_service.create_knowledge(knowledge_request)


@router.get("/search", response_model=KnowledgeSearchResponse)
async def search_knowledges(
    query: str = Query(..., min_length=1, description="搜索关键词")
):
    """
    搜索知识文档
    
    Args:
        query: 搜索关键词
        
    Returns:
        匹配的知识文档列表
    """
    return await knowledges_service.search_knowledges(query)


@router.get("/{knowledge_id}", response_model=KnowledgeResponse)
async def get_knowledge(knowledge_id: str):
    """
    获取知识文档详情
    
    返回指定知识文档的完整信息，包括所有关联的blocks
    
    Args:
        knowledge_id: 知识文档的唯一标识符
        
    Returns:
        知识文档的详细信息，包括：
        - 基本元数据（标题、描述、标签等）
        - 关联的blocks列表
        - 创建和修改时间
        - 反向链接信息
        
    Raises:
        HTTPException: 当知识文档不存在时返回404
    """
    knowledge = await knowledges_service.get_knowledge(knowledge_id)
    if not knowledge:
        raise HTTPException(status_code=404, detail="Knowledge not found")
    return knowledge


@router.patch("/{knowledge_id}", response_model=KnowledgeResponse)
async def update_knowledge_metadata(
    knowledge_id: str, 
    metadata_request: UpdateKnowledgeMetadataRequest
):
    """
    更新知识文档的元数据
    
    只更新标题、描述、标签等元数据，不影响内容块
    
    Args:
        knowledge_id: 要更新的知识文档ID
        metadata_request: 包含要更新的元数据字段
                 
    Returns:
        更新后的知识文档元数据
        
    Raises:
        HTTPException: 当知识文档不存在时返回404
    """
    knowledge = await knowledges_service.update_knowledge_metadata(knowledge_id, metadata_request)
    if not knowledge:
        raise HTTPException(status_code=404, detail="Knowledge not found")
    return knowledge


@router.delete("/{knowledge_id}", response_model=DeleteKnowledgeResponse)
async def delete_knowledge(knowledge_id: str):
    """
    删除知识文档
    
    删除指定的知识文档，同时处理：
    - 解除与blocks的关联关系
    - 清理其他文档的反向链接
    - 保留blocks本身（不级联删除）
    
    Args:
        knowledge_id: 要删除的知识文档ID
        
    Returns:
        删除操作的确认信息
        
    Raises:
        HTTPException: 当知识文档不存在时返回404
    """
    success = await knowledges_service.delete_knowledge(knowledge_id)
    if not success:
        raise HTTPException(status_code=404, detail="Knowledge not found")
    return DeleteKnowledgeResponse(success=True, message="Knowledge deleted successfully")


@router.post("/{knowledge_id}/export")
async def export_knowledge_to_markdown(
    knowledge_id: str,
    include_metadata: bool = Query(True, description="是否包含元数据"),
    include_backlinks: bool = Query(False, description="是否包含反向链接")
):
    """
    导出知识文档为Markdown格式
    
    将知识文档及其关联的blocks导出为标准Markdown文件
    
    Args:
        knowledge_id: 要导出的知识文档ID
        include_metadata: 是否在导出文件中包含元数据（标签、时间等）
        include_backlinks: 是否在文档末尾添加反向链接列表
        
    Returns:
        Markdown格式的文档内容
        响应头Content-Type为text/markdown
        
    Raises:
        HTTPException: 当知识文档不存在时返回404
    """
    markdown_content = await knowledges_service.export_knowledge_to_markdown(
        knowledge_id, include_metadata, include_backlinks
    )
    if not markdown_content:
        raise HTTPException(status_code=404, detail="Knowledge not found")
    
    return Response(
        content=markdown_content,
        media_type="text/markdown",
        headers={"Content-Disposition": f"attachment; filename={knowledge_id}.md"}
    )


@router.get("/{knowledge_id}/backlinks", response_model=KnowledgeBacklinksResponse)
async def get_knowledge_backlinks(knowledge_id: str):
    """
    获取知识文档的反向引用列表
    
    返回所有引用了当前知识文档的其他文档和blocks
    
    Args:
        knowledge_id: 知识文档ID
        
    Returns:
        反向引用列表，包括：
        - 引用的知识文档列表
        - 引用的思考笔记列表
        - 引用的任务列表
        - 引用的blocks列表
        
    Raises:
        HTTPException: 当知识文档不存在时返回404
    """
    backlinks = await knowledges_service.get_knowledge_backlinks(knowledge_id)
    if backlinks is None:
        raise HTTPException(status_code=404, detail="Knowledge not found")
    return backlinks


@router.post("/{knowledge_id}/link-block", response_model=LinkBlockToKnowledgeResponse)
async def link_block_to_knowledge(
    knowledge_id: str, 
    link_request: LinkBlockToKnowledgeRequest
):
    """
    将block链接到知识文档
    
    建立知识文档与block之间的显式关联关系
    
    Args:
        knowledge_id: 知识文档ID
        link_request: 链接信息
                  
    Returns:
        链接操作的结果信息
        
    Raises:
        HTTPException: 当知识文档或block不存在时返回404
    """
    result = await knowledges_service.link_block_to_knowledge(knowledge_id, link_request)
    if not result:
        raise HTTPException(status_code=404, detail="Knowledge or block not found")
    return result


 