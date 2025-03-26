import asyncio
import secrets
import time
import requests

from fastapi import Depends, HTTPException, status, APIRouter
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer

from config import CASDOOR_APP_NAME, CASDOOR_CLIENT_ID, CASDOOR_CLIENT_SECRET, CASDOOR_ENDPOINT, \
    CASDOOR_ORGANIZATION_NAME, CASDOOR_REDIRECT_URI, CASDOOR_TOKEN_ENDPOINT
from schemas import CallbackRequest, TokenResponse, UserInfo

SESSION_STATE_EXPIRATION_TIME = 600

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=CASDOOR_TOKEN_ENDPOINT)
jwt_router = APIRouter()
session_states = {} 

async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserInfo:
    try:
        response = await asyncio.to_thread(requests.get, f"{CASDOOR_ENDPOINT}/api/user", 
                                             headers={"Authorization": f"Bearer {token}"})
        
        response.raise_for_status()
        # 将响应转换为 JSON，并创建 UserInfoResponse 对象
        user_data = response.json()
        return UserInfo(
            id=user_data["id"],
            name=user_data["name"],
            email=user_data["email"],
            email_verified_at=user_data["email_verified_at"],
            created_at=user_data["created_at"],
            updated_at=user_data["updated_at"]
        )
    except requests.exceptions.HTTPError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal Server Error: {str(e)}",
        )

def requests_get_token(token_endpoint, token_params, headers):
    try:
        response = requests.post(token_endpoint, data=token_params, headers=headers)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.HTTPError as e:
        raise e
    except Exception as e:
        raise e
    
@jwt_router.post("/login")
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

@jwt_router.post("/callback")
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
    
@jwt_router.get("/user_info")
async def user_info(user: UserInfo = Depends(get_current_user)) -> UserInfo:
    """获取用户信息

    Args:
        user (dict, optional): JWT认证的用户信息. Defaults to Depends(get_current_user).

    Returns:
        UserInfoResponse: 用户信息
    """
    return user