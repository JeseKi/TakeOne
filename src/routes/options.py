import random
from typing import Dict, List
from fastapi import Depends,  HTTPException, APIRouter
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from database.crud import CreateChoice, create_choices
from database.base import get_db
from routes.jwt_utils import get_current_user
from llm import MajorsReveal, gen_majors_reveal
from schemas import PostChoicesResponse, UserInfo, GetChoicesResponse, GetRoundResponse

majors = ["计算机类", "心理学类", "教育学类", "历史学类", "医学", "文学", "数学类", "物理学类"]
user_select_round:Dict[str, int] = {}

options_router = APIRouter()

@options_router.post("/post_choices/{session_id}", response_model=PostChoicesResponse)
async def post_choices(session_id: str) -> PostChoicesResponse:
    pass

@options_router.get("/get_choices/{session_id}", response_model=GetChoicesResponse)
async def get_choices(session_id: str) -> GetChoicesResponse:
    pass
    
@options_router.get("/get_round/{session_id}", response_model=GetRoundResponse)
async def get_round(session_id: str) -> GetRoundResponse:
    pass
    
@options_router.post("/gen_report/{session_id}")
async def gen_report(session_id: str, user: UserInfo = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """生成最终的报告"""
    # TODO: 生成最终的报告
    pass

