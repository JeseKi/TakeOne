import time
from typing import List
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import requests
from starlette.middleware.sessions import SessionMiddleware

import secrets
import asyncio
from pydantic import BaseModel

from jwt_utils import get_current_user, requests_get_token

from config import CASDOOR_CLIENT_SECRET, CASDOOR_ENDPOINT, CASDOOR_CLIENT_ID, CASDOOR_REDIRECT_URI \
    , CASDOOR_APP_NAME, CASDOOR_ORGANIZATION_NAME, CASDOOR_TOKEN_ENDPOINT, SECRET_KEY

origins = [
    "http://localhost:3000", 
    "http://localhost:8080",
    "https://ki-test-frontend.kispace.cc",
]

session_states = {} 
SESSION_STATE_EXPIRATION_TIME = 600
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],  
)
app.add_middleware(SessionMiddleware, secret_key=SECRET_KEY)

class BaseInformation(BaseModel):
    max_living_expenses_from_parents: str  # 父母可供的大学生活费上限是多少？
    enough_savings_for_college: str  # 当前积蓄是否可能不贷款供完大学四年的生活费？
    pocket_money_usage: str  # 你平时的零花钱的用途是什么？
    willing_to_repeat_high_school_for_money: str  # 假如让你再读三年高三，每年都会给你的家庭免费的十万人民币，你愿意吗？
    city_tier: str  # 主要居住地区是几线城市？
    parents_in_public_sector: str  # 父母是否属于体制内？
    has_stable_hobby: str  # 是否有稳定的爱好？（需要每周起码有一半的天数会每天做的，且持续时间是一年以上）
    self_learning_after_gaokao: str  # 在高考完后的这段时间，是否有每天自主学习的习惯？
    proactive_in_competitions: str  # 是否主动参加过竞赛？（被推着上去推着走的不算）
    likes_reading_extracurricular_books: str  # 平时是否喜欢阅读课外书？

class Major(BaseModel):
    major: str
    description: str
    is_chosen: bool

class MajorChoice(BaseModel):
    major_a: Major
    major_b: Major

class MajorChoiceResult(BaseModel):
    major_name: str
    descriptions: List[str]
    chosen_sequence: List[int]

class SessionInfo(BaseModel):
    base_information: BaseInformation
    major_choices_result: List[MajorChoiceResult]
    
class CallbackRequest(BaseModel):
    code: str
    state: str
    
class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    id_token: str
    scope: str
    token_type: str
    expires_in: int

class UserInfoResponse(BaseModel):
    id: str
    name: str
    email: str
    email_verified_at: str
    created_at: str
    updated_at: str

@app.get("/")
async def root(user: dict = Depends(get_current_user)):
    return {"message": "Hello World"}

@app.post("/api/login")
async def login_with_casdoor() -> str:
    """使用Casdoor进行登录

    Returns:
        str: Casdoor的登录链接
    """
    state = secrets.token_hex(16)
    expire_time = time.time() + SESSION_STATE_EXPIRATION_TIME
    session_states[state] = expire_time

    authorization_url = (
        f"{CASDOOR_ENDPOINT}/login/oauth/authorize?"
        f"client_id={CASDOOR_CLIENT_ID}"
        f"&response_type=code"
        f"&redirect_uri={CASDOOR_REDIRECT_URI}"
        f"&scope=openid profile email"
        f"&state={state}"
        f"&application={CASDOOR_APP_NAME}"
        f"&org={CASDOOR_ORGANIZATION_NAME}"
    )
    return authorization_url

@app.post("/api/callback")
async def casdoor_callback(callback: CallbackRequest) -> TokenResponse:
    """获取Casdoor的token

    Args:
        code (str, optional): 授权码. Defaults to Form(...).
        state (str, optional): 状态码. Defaults to Form(...).

    Returns:
        TokenResponse: Casdoor的token
    """
    code = callback.code
    state = callback.state
    expire_time = session_states.get(state)
    
    if expire_time is None:
        return JSONResponse(content={"error": "无效的状态码，可能为 CSRF 攻击或 state 已过期"}, status_code=400)

    if time.time() > expire_time:
        del session_states[state]
        return JSONResponse(content={"error": "状态码已过期"}, status_code=400)

    token_endpoint = CASDOOR_TOKEN_ENDPOINT
    token_params = {
        "grant_type": "authorization_code",
        "code": code,
        "client_id": CASDOOR_CLIENT_ID,
        "client_secret": CASDOOR_CLIENT_SECRET,
    }
    headers = {"Content-Type": "application/x-www-form-urlencoded"}

    try:
        token_data = await asyncio.to_thread(requests_get_token, token_endpoint, token_params, headers)
        return token_data

    except requests.exceptions.HTTPError as e:
        return JSONResponse(content={"error": f"Failed to get token from Casdoor: {e}"}, status_code=400)
    except Exception as e:
        return JSONResponse(content={"error": f"Internal server error during token exchange: {e}"}, status_code=500)

async def cleanup_expired_states():
    # 定期清理过期的状态码
    while True:
        keys_to_delete = []
        for state, expire_time in session_states.items():
            if time.time() > expire_time:
                keys_to_delete.append(state)

        for key in keys_to_delete:
            del session_states[key]

        await asyncio.sleep(600)
    
@app.get("/api/user_info")
async def user_info(user: dict = Depends(get_current_user)) -> UserInfoResponse:
    """获取用户信息

    Args:
        user (dict, optional): JWT认证的用户信息. Defaults to Depends(get_current_user).

    Returns:
        UserInfoResponse: 用户信息
    """
    return user

@app.post("/api/base_information")
async def base_information(info: BaseInformation, user: dict = Depends(get_current_user)) -> str:
    """收集这名高中生的基本信息，并创建一个新的会话

    Args:
        info (BaseInformation): 基本信息的json
        user (dict, optional): JWT认证的用户信息. Defaults to Depends(get_current_user).

    Returns:
        str: 会话id
    """
    # TODO: 从客户端中收集用户的信息
    pass

@app.post("/api/post_options")
async def post_options(session_id:str, choice: MajorChoice, user: dict = Depends(get_current_user)) -> bool:
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
async def gen_options(session_id:str, choice: MajorChoice, user: dict = Depends(get_current_user)) -> MajorChoice:
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
async def sessions_get(user: dict = Depends(get_current_user)) -> List[str]:
    """拉取这个高中生的所有的会话

    Args:
        user (dict, optional): JWT认证的用户信息. Defaults to Depends(get_current_user).

    Returns:
        List[str]: 所有的会话id
    """
    # TODO: 拉取用户所有的会话
    pass

@app.get("/api/sessions/{session_id}")
async def session_get(user: dict = Depends(get_current_user)) -> SessionInfo:
    """拉取这个高中生的特定会话的信息

    Args:
        user (dict, optional): JWT认证的用户信息. Defaults to Depends(get_current_user).

    Returns:
        SessionInfo: 具体的会话信息
    """
    # TODO: 拉取特定会话用户已经做出的选择和信息
    pass