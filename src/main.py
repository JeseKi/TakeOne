import asyncio
from typing import List
from fastapi import Depends, FastAPI
from fastapi.concurrency import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from database import CreateSession, create_session, get_db
from jwt_utils import cleanup_expired_states, get_current_user, jwt_router
from config import SECRET_KEY
from models import BaseInformationRequest, MajorChoice, SessionInfoResponse, UserInfo

origins = [
    "http://localhost:3000", 
    "http://localhost:8080",
    "https://ki-test-frontend.kispace.cc",
]

@asynccontextmanager
async def lifespan(app: FastAPI):
    asyncio.create_task(cleanup_expired_states())
    print("SelfKnowing已启动")
    yield
    print("SelfKnowing关闭中...")
    
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

@app.post("/api/base_information")
async def base_information(info: BaseInformationRequest, user: UserInfo = Depends(get_current_user), db = Depends(get_db)) -> str:
    """收集这名高中生的基本信息，并创建一个新的会话

    Args:
        info (BaseInformation): 基本信息的json
        user (dict, optional): JWT认证的用户信息. Defaults to Depends(get_current_user).

    Returns:
        str: 会话id
    """
    user_id = user.id
    new_session_info = CreateSession(user_id=user_id, base_information=info)
    new_session = create_session(db, new_session_info)
    return new_session.uuid

@app.post("/api/post_options")
async def post_options(session_id:str, choice: MajorChoice, user: UserInfo = Depends(get_current_user)) -> bool:
    """将这个高中生的选项转存进数据库中，如果成功则返回True，用于让前端继续请求到`/api/gen_options`

    Args:
        session_id (str): 会话id
        choice (MajorChoice): 上一轮的选项结果
        user (dict, optional): JWT认证的用户信息. Defaults to Depends(get_current_user).

    Returns:
        bool: 是否成功
    """
    # TODO: 将用户的选项提交给大语言模型，返回是否成功，如果成功则前端需要进一步请求 /api/gen_options
    pass

@app.post("/api/gen_options")
async def gen_options(session_id:str, choice: MajorChoice, user: UserInfo = Depends(get_current_user)) -> MajorChoice:
    """建立WS连接，并让大模型生成选项

    Args:
        session_id (str): 会话id
        choice (MajorChoice): 上一轮的选项结果
        user (dict, optional): JWT认证的用户信息. Defaults to Depends(get_current_user).

    Returns:
        MajorChoice: 大语言模型生成的选项
    """
    # TODO: 让大语言模型根据用户的选择信息生成选项
    pass

@app.get("/api/sessions")
async def sessions_get(user: UserInfo = Depends(get_current_user)) -> List[str]:
    """拉取这个高中生的所有的会话

    Args:
        user (dict, optional): JWT认证的用户信息. Defaults to Depends(get_current_user).

    Returns:
        List[str]: 所有的会话id
    """
    # TODO: 拉取用户所有的会话
    pass

@app.get("/api/sessions/{session_id}")
async def session_get(user: UserInfo = Depends(get_current_user)) -> SessionInfoResponse:
    """拉取这个高中生的特定会话的信息

    Args:
        user (dict, optional): JWT认证的用户信息. Defaults to Depends(get_current_user).

    Returns:
        SessionInfo: 具体的会话信息
    """
    # TODO: 拉取特定会话用户已经做出的选择和信息
    pass