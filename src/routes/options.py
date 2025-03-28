import random
from typing import Dict, List, Tuple, Set
from fastapi import Depends,  HTTPException, APIRouter
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from database.crud import CreateChoice, CreateRound, UpdateRound, create_choices, create_round, get_session, UpdateChoice, update_choices, update_round
from database.base import get_db
from database.models import RoundStatus
from routes.jwt_utils import get_current_user
from llm import MajorsReveal, gen_majors_reveal
from schemas import (MajorChoiceRequest, PostChoicesResponse, UserInfo, GetChoicesResponse, 
                     GetRoundResponse, GenerrateType, ChoiceResponse)

majors = {"计算机类", "心理学类", "教育学类", "历史学类", "医学", "文学", "数学类", "物理学类"}

options_router = APIRouter()

@options_router.post("/post_choices/{session_id}", response_model=PostChoicesResponse)
async def post_choices(session_id: str, 
                       choices: MajorChoiceRequest,
                       user: UserInfo = Depends(get_current_user), 
                       db: AsyncSession = Depends(get_db)) -> PostChoicesResponse:
    try:
        session = await get_session(db, session_id, user.id)
        
        if len(session.rounds) == 0 and choices.choices == None:
            return PostChoicesResponse(
                generate_type=GenerrateType.ROUND
            )
            
        last_round = session.rounds[-1]
        
        update_choice_1, update_choice_2 = (UpdateChoice(uuid=choices.choices[0].major_id, is_winner_in_comparison=choices.choices[0].is_winner_in_comparison), 
                                            UpdateChoice(uuid=choices.choices[1].major_id, is_winner_in_comparison=choices.choices[1].is_winner_in_comparison))
        await update_choices(db, (update_choice_1, update_choice_2))
        
        if len(last_round.current_round_majors) == 1:
            return PostChoicesResponse(
                generate_type=GenerrateType.REPORT
            )
            
        appeared_majors = {choice.major_name for choice in last_round.appearances if choice.is_winner_in_comparison is not None}
        unappear_majors = set(last_round.current_round_majors) - appeared_majors
            
        if len(unappear_majors) == 0 or len(unappear_majors) == 1:
            round_update = UpdateRound(round_id=last_round.uuid, status=RoundStatus.COMPLETED)
            await update_round(db, round_update)
            
            if len(unappear_majors) == 1:
                remaining_major = list(unappear_majors)[0]
                auto_win_choice = CreateChoice(
                    round_id=last_round.uuid,
                    session_id=session_id,
                    major_name=remaining_major,
                    description=f"{remaining_major}轮空晋级",
                    appearance_index=len(last_round.appearances)
                )
                auto_win_update = UpdateChoice(
                    uuid=auto_win_choice.uuid,
                    is_winner_in_comparison=True
                )
                await create_choices(db, (auto_win_choice,), user.id)
                await update_choices(db, (auto_win_update,))
                
            return PostChoicesResponse(
                generate_type=GenerrateType.ROUND
            )
            
        return PostChoicesResponse(
            generate_type=GenerrateType.CHOICES
        )
        
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@options_router.get("/get_choices/{session_id}", response_model=GetChoicesResponse)
async def get_choices(session_id: str, db: AsyncSession = Depends(get_db), user: UserInfo = Depends(get_current_user)) -> GetChoicesResponse:
    try:
        session = await get_session(db, session_id, user.id)
        
        if len(session.rounds) == 0:
            raise HTTPException(status_code=400, detail="当前会话没有进行中的轮次")
            
        last_round = session.rounds[-1]
        
        if last_round.status != RoundStatus.ACTIVE:
            raise HTTPException(status_code=400, detail="当前轮次已完成")
        
        appeared_majors = {choice.major_name for choice in last_round.appearances if choice.is_winner_in_comparison is not None}
        unappear_majors = set(last_round.current_round_majors) - appeared_majors
        
        if len(unappear_majors) < 2:
            raise HTTPException(status_code=400, detail="当前轮次没有足够的专业进行比较")
        
        major_name_1, major_name_2 = random.sample(list(unappear_majors), 2)
        
        major_reveal = await gen_majors_reveal(session.base_information, major_name_1, major_name_2)
        
        appearance_index = len(last_round.appearances)
        major_1, major_2 = (
            CreateChoice(
                round_id=last_round.uuid, 
                session_id=session_id, 
                major_name=major_name_1, 
                description=major_reveal.major_1_description, 
                appearance_index=appearance_index
            ),
            CreateChoice(
                round_id=last_round.uuid, 
                session_id=session_id, 
                major_name=major_name_2, 
                description=major_reveal.major_2_description, 
                appearance_index=appearance_index + 1
            )
        )
        
        new_choices = await create_choices(db, (major_1, major_2), user.id)
        
        return GetChoicesResponse(
            choices=tuple(new_choices)
        )
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    
@options_router.get("/get_round/{session_id}", response_model=GetRoundResponse)
async def get_round(session_id: str, db: AsyncSession = Depends(get_db), user: UserInfo = Depends(get_current_user)) -> GetRoundResponse:
    try:
        session = await get_session(db, session_id, user.id)
        base_info = session.base_information
        next_round_num = 1
        appearance_index_1 = 0
        appearance_index_2 = 1
        current_round_majors = set(majors)
        
        if len(session.rounds) > 1:
            next_round_num = session.current_round_number + 1
            current_round_majors = {choice.major_name for choice in session.rounds[-1].appearances 
                                   if choice.is_winner_in_comparison}
            
        round = CreateRound(session_id=session_id, round_number=next_round_num, current_round_majors=current_round_majors)
        new_round = await create_round(db, round)
        
        major_name_1, major_name_2 = random.sample(list(current_round_majors), 2)
        major_reveal = await gen_majors_reveal(base_info, major_name_1, major_name_2)
        
        major_1, major_2 = (
            CreateChoice(
                round_id=new_round.uuid, 
                session_id=session_id, 
                major_name=major_name_1, 
                description=major_reveal.major_1_description, 
                appearance_index=appearance_index_1
            ),
            CreateChoice(
                round_id=new_round.uuid, 
                session_id=session_id, 
                major_name=major_name_2, 
                description=major_reveal.major_2_description, 
                appearance_index=appearance_index_2
            )
        )
        
        new_choices = await create_choices(db, (major_1, major_2), user.id)
        
        # 在返回响应时，将数据库对象转换为 Pydantic 模型
        return GetRoundResponse(
            current_round_number=next_round_num,
            current_round_majors=list(current_round_majors),
            choices=(
                ChoiceResponse(
                    major_id=new_choices[0].uuid,
                    major_name=new_choices[0].major_name,
                    description=new_choices[0].description,
                    appearance_index=new_choices[0].appearance_index,
                    is_winner_in_comparison=new_choices[0].is_winner_in_comparison
                ),
                ChoiceResponse(
                    major_id=new_choices[1].uuid,
                    major_name=new_choices[1].major_name,
                    description=new_choices[1].description,
                    appearance_index=new_choices[1].appearance_index,
                    is_winner_in_comparison=new_choices[1].is_winner_in_comparison
                )
            )
        )
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@options_router.get("/gen_report/{session_id}")
async def gen_report(session_id: str, user: UserInfo = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """生成最终的报告"""
    # TODO: 生成最终的报告
    pass
