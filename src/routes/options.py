import random
from typing import Dict, List
from fastapi import Depends,  HTTPException, APIRouter
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from database.crud import CreateChoice, create_choices
from database.base import get_db
from routes.jwt_utils import get_current_user
from llm import MajorsReveal, gen_majors_reveal
from schemas import BaseInformation, Major, MajorChoice, UserInfo

majors = ["计算机类", "心理学类", "教育学类", "历史学类", "医学", "文学", "数学类", "物理学类"]
user_select_round:Dict[str, int] = {}

options_router = APIRouter()

@options_router.post("/gen_options/{session_id}", response_model=MajorChoice)
async def gen_options(session_id:str, 
                      choices: List[MajorChoice],
                      base_infomation: BaseInformation,  
                      user: UserInfo = Depends(get_current_user),
                      db: AsyncSession = Depends(get_db),
                      ) -> MajorChoice:
    """让大模型生成选项并返回

    Args:
        session_id (str): 会话id
        choices (List[MajorChoice]): 当前的选项结果列表
        user (dict, optional): JWT认证的用户信息. Defaults to Depends(get_current_user).

    Returns:
        MajorChoice: 大语言模型生成的选项
    """
    try:
        user_id: str = user.id
        max_order = len(choices)
        selected_choices_name: List[str] = []
        logger.debug("Generating new options")
        
        for choice in choices:
            selected_choices_name.append(choice.major_a)
            selected_choices_name.append(choice.major_b)
        can_select_majors = list(set(majors) - set(selected_choices_name))
        
        if len(can_select_majors) == 0:
            return MajorChoice(major_a=None, major_b=None, need_gen_report=True)
        
        if len(can_select_majors) == 1:
            major_name = can_select_majors[0]
            major_description = await gen_majors_reveal(base_infomation.model_dump_json(indent=4), major_name, selected_choices_name[0])
            create_choice_content = CreateChoice(
                user_id=user_id,
                session_id=session_id,
                name=major_name,
                descriptions=major_description,
                appearance_order=max_order + 1
            )
            await create_choices(db, [create_choice_content])
            major = Major(name=major_name, description=major_description)
            return MajorChoice(major_a=major, major_b=None)
            
        major_a_name, major_b_name = random.sample(can_select_majors, 2)
        logger.debug(f"Major A: {major_a_name}, Major B: {major_b_name}")
        majors_reval: MajorsReveal = await gen_majors_reveal(base_infomation.model_dump_json(indent=4), major_a_name, major_b_name)
        logger.debug(f"Major A: {majors_reval.major_a_description}, Major B: {majors_reval.major_b_description}")
        major_a = Major(name=major_a_name, description=majors_reval.major_a_description)
        major_b = Major(name=major_b_name, description=majors_reval.major_b_description)
        
        create_choice_a = CreateChoice(
            user_id=user_id,
            session_id=session_id,
            name=major_a_name,
            descriptions=majors_reval.major_a_description,
            appearance_order=max_order
        )
        create_choice_b = CreateChoice(
            user_id=user_id,
            session_id=session_id,
            name=major_b_name,
            descriptions=majors_reval.major_b_description,
            appearance_order=max_order+1
        )
        
        await create_choices(db, [create_choice_a, create_choice_b])
        
        return MajorChoice(major_a=major_a, major_b=major_b)
            
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    
@options_router.post("/gen_report/{session_id}")
async def gen_report(session_id: str, user: UserInfo = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """生成最终的报告"""
    # TODO: 生成最终的报告
    pass

