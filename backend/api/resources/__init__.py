"""
Resources API 模块初始化

统一导出所有资源相关的API路由器
"""

from .blocks import router as blocks_router
from .knowledges import router as knowledges_router  
from .thoughts import router as thoughts_router
from .todos import router as todos_router
from .reviews import router as reviews_router

__all__ = [
    "blocks_router",
    "knowledges_router", 
    "thoughts_router",
    "todos_router",
    "reviews_router"
] 