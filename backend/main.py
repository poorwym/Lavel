from fastapi import FastAPI

app = FastAPI()

@app.get("/")
async def read_root():
    return {"message": "你好，FastAPI 示例！"}

