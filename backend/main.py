from fastapi import FastAPI
from pathlib import Path
from utils.config import Config
# 导入资源路由器
from api.resources import (
    blocks_router,
    knowledges_router,
    thoughts_router,
    todos_router,
    reviews_router
)

app = FastAPI(
    title="Lavel API",
    description="Lavel 知识管理系统 API",
    version="1.0.0"
)

Config.init_dirs()
# 注册资源路由器
app.include_router(blocks_router, prefix="/api/resources/blocks", tags=["Blocks"])
app.include_router(knowledges_router, prefix="/api/resources/knowledges", tags=["Knowledges"])
app.include_router(thoughts_router, prefix="/api/resources/thoughts", tags=["Thoughts"])
app.include_router(todos_router, prefix="/api/resources/todos", tags=["Todos"])
app.include_router(reviews_router, prefix="/api/resources/reviews", tags=["Reviews"])

@app.get("/")
async def read_root():
    return {"message": "你好，Lavel API！"}


@app.get("/health")
async def health_check():
    """健康检查端点"""
    return {"status": "healthy", "service": "Lavel API"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
