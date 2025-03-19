from typing import List
from fastapi import Depends, FastAPI
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from jwt_utils import get_current_user, jwt_router

from config import CASDOOR_ENDPOINT, CASDOOR_CLIENT_ID, CASDOOR_REDIRECT_URI \
    , CASDOOR_APP_NAME, CASDOOR_ORGANIZATION_NAME
    
app = FastAPI()

app.include_router(jwt_router, prefix="/api")

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

@app.get("/")
async def root(user: dict = Depends(get_current_user)):
    return {"message": "Hello World"}

@app.get("/login")
async def login_with_casdoor():
    # TODO： 前期测试用，后期删除，使用前端来处理登录
    authorization_url = (
        f"{CASDOOR_ENDPOINT}/login/oauth/authorize?client_id={CASDOOR_CLIENT_ID}"
        f"&response_type=code&redirect_uri={CASDOOR_REDIRECT_URI}&scope=openid profile email&state=state&application={CASDOOR_APP_NAME}&org={CASDOOR_ORGANIZATION_NAME}"
    )
    return RedirectResponse(authorization_url)

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