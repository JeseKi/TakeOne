import asyncio
from fastapi import FastAPI
from fastapi.concurrency import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from loguru import logger

from database.base import init_db
from routes.jwt_utils import cleanup_expired_states
from config import SECRET_KEY
from routes import sessions_router, jwt_router, options_router

origins = [
    "http://localhost:3000", 
    "http://localhost:8080",
    "https://ki-test-frontend.kispace.cc",
]

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("SelfKnowing启动中...")
    asyncio.create_task(cleanup_expired_states())
    await init_db()
    logger.info("SelfKnowing已启动")
    yield
    logger.info("SelfKnowing关闭中...")
    
app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],  
)
app.add_middleware(SessionMiddleware, secret_key=SECRET_KEY)

app.include_router(jwt_router, prefix="/api/auth")
app.include_router(sessions_router, prefix="/api")
app.include_router(options_router, prefix="/api/options")