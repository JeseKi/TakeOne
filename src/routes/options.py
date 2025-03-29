from math import log
import random
from fastapi import Depends,  HTTPException, APIRouter
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger
import asyncio
import json

from database.crud import (CreateChoice, CreateRound, UpdateRound, create_choices, create_round, 
                           get_session, UpdateChoice, update_choices, update_round, update_session, UpdateSession)
from database.base import get_db
from database.models import RoundStatus, SessionStatus
from routes.jwt_utils import get_current_user
from llm import gen_majors_reveal, MajorsReveal, gen_wisdom_report
from schemas import (MajorChoiceRequest, PostChoicesResponse, UserInfo, GetChoicesResponse, 
                     GetRoundResponse, GenerrateType, ChoiceResponse, Report)

majors = {"计算机类", "心理学类", "教育学类", "历史学类", "医学", "文学", "数学类", "物理学类"}

options_router = APIRouter()
session_lock = set()

@options_router.post("/post_choices/{session_id}", response_model=PostChoicesResponse)
async def post_choices(session_id: str, 
                       choices: MajorChoiceRequest,
                       user: UserInfo = Depends(get_current_user), 
                       db: AsyncSession = Depends(get_db)) -> PostChoicesResponse:
    if session_id in session_lock:
        raise HTTPException(status_code=409, detail="会话正在处理中，请稍后重试")
    
    try:
        await asyncio.to_thread(session_lock.add, session_id)
        
        session = await get_session(db, session_id, user.id)
        
        if len(session.rounds) == 0 and choices.choices == None:
            return PostChoicesResponse(
                generate_type=GenerrateType.ROUND
            )
        
        update_choice_1, update_choice_2 = (UpdateChoice(uuid=choices.choices[0].major_id, is_winner_in_comparison=choices.choices[0].is_winner_in_comparison), 
                                            UpdateChoice(uuid=choices.choices[1].major_id, is_winner_in_comparison=choices.choices[1].is_winner_in_comparison))
        await update_choices(db, (update_choice_1, update_choice_2))
        
        updated_session = await get_session(db, session_id, user.id)
        last_round = updated_session.rounds[-1]
        
        if len(last_round.current_round_majors) == 2 and len(last_round.appearances) == 2:
            await update_session(db, UpdateSession(session_id=session_id, 
                                                   current_round_number=last_round.round_number + 1, 
                                                   status=SessionStatus.FINISHED, 
                                                   final_major_name=last_round.appearances[-1].major_name if last_round.appearances[-1].is_winner_in_comparison else last_round.appearances[-2].major_name
                                                   ))
            return PostChoicesResponse(
                generate_type=GenerrateType.REPORT
            )
            
        appeared_majors = {choice.major_name for choice in last_round.appearances if choice.is_winner_in_comparison is not None}
        unappear_majors = set(last_round.current_round_majors) - appeared_majors
        
        logger.debug(f"appeared_majors: {appeared_majors}, unappear_majors: {unappear_majors}, last_round.uuid: {last_round.uuid}")
            
        if len(unappear_majors) == 0 or len(unappear_majors) == 1:
            round_update = UpdateRound(round_id=last_round.uuid, status=RoundStatus.COMPLETED)
            
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
            
            await update_round(db, round_update)
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
        
        logger.debug(f"appeared_majors: {appeared_majors}, unappear_majors: {unappear_majors}")
        
        if len(unappear_majors) < 2:
            raise HTTPException(status_code=400, detail="当前轮次没有足够的专业进行比较")
        
        major_name_1, major_name_2 = random.sample(list(unappear_majors), 2)
        
        major_reveal = await gen_majors_reveal(session.base_information, major_name_1, major_name_2)
        # major_reveal = MajorsReveal(major_1_description="", major_2_description="") # 测试
        
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
        
        new_choices_response = (ChoiceResponse(
            major_id=new_choices[0].uuid,
            major_name=new_choices[0].major_name,
            description=new_choices[0].description,
            appearance_index=new_choices[0].appearance_index,
            is_winner_in_comparison=None
        ),
        ChoiceResponse(
            major_id=new_choices[1].uuid,
            major_name=new_choices[1].major_name,
            description=new_choices[1].description,
            appearance_index=new_choices[1].appearance_index,
            is_winner_in_comparison=None
        ))
        
        return GetChoicesResponse(
            choices=new_choices_response
        )
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    finally:
        await asyncio.to_thread(session_lock.remove, session_id)
    
@options_router.get("/get_round/{session_id}", response_model=GetRoundResponse)
async def get_round(session_id: str, db: AsyncSession = Depends(get_db), user: UserInfo = Depends(get_current_user)) -> GetRoundResponse:
    try:
        session = await get_session(db, session_id, user.id)
        base_info = session.base_information
        next_round_num = 1
        appearance_index_1 = 0
        appearance_index_2 = 1
        current_round_majors = set(majors)
        
        if len(session.rounds) >= 1:
            next_round_num = session.current_round_number + 1
            current_round_majors = {choice.major_name for choice in session.rounds[-1].appearances 
                                   if choice.is_winner_in_comparison}
            
        round_create = CreateRound(session_id=session_id, round_number=next_round_num, current_round_majors=current_round_majors)
        session_update = UpdateSession(session_id=session_id, current_round_number=next_round_num)
        new_round = await create_round(db, round_create)
        await update_session(db, session_update)
        
        major_name_1, major_name_2 = random.sample(list(current_round_majors), 2)
        major_reveal = await gen_majors_reveal(base_info, major_name_1, major_name_2)
        # major_reveal = MajorsReveal(major_1_description="", major_2_description="") # 测试
        
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
    finally:
        await asyncio.to_thread(session_lock.remove, session_id)
        
@options_router.get("/gen_report/{session_id}", response_model=Report)
async def gen_report(session_id: str, user: UserInfo = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> Report:
    """生成最终的报告"""
    logger.info(f"生成用户 {user.id} 的会话 {session_id} 的最终报告")
    
    session = await get_session(db, session_id, user.id)
    
    if session.status != SessionStatus.FINISHED:
        raise HTTPException(status_code=400, detail="会话未完成，无法生成报告")
    
    final_majors = []
    seen_majors = set()
    
    for round in reversed(session.rounds):
        if len(final_majors) >= 3:
            break
        
        for appearance in round.appearances:
            if appearance.is_winner_in_comparison == True and appearance.major_name not in seen_majors:
                final_majors.append(appearance.major_name)
                seen_majors.add(appearance.major_name)
                
                if len(final_majors) >= 3:
                    break
    
    logger.debug(f"final_majors: {final_majors}")
    
    if len(final_majors) < 3:
        raise HTTPException(status_code=400, detail="没有足够的胜出专业来生成报告")
    
    try:
        base_info_dict: dict[str, str] = json.loads(session.base_information)
    except json.JSONDecodeError as e:
        logger.error(f"解析base_information失败: {e}")
        raise HTTPException(status_code=500, detail="解析用户基本信息失败")
    
    logger.debug(f"base_info_dict: {base_info_dict}")
    
    student_info = "\n".join([
        f"- 父母可供的大学生活费上限: {base_info_dict.get('max_living_expenses_from_parents', '未知')}",
        f"- 当前积蓄是否足够: {base_info_dict.get('enough_savings_for_college', '未知')}",
        f"- 零花钱用途: {base_info_dict.get('pocket_money_usage', '未知')}",
        f"- 愿意为了金钱再读高三: {base_info_dict.get('willing_to_repeat_high_school_for_money', '未知')}",
        f"- 居住在几线城市: {base_info_dict.get('city_tier', '未知')}",
        f"- 父母是否体制内: {base_info_dict.get('parents_in_public_sector', '未知')}",
        f"- 是否有稳定爱好: {base_info_dict.get('has_stable_hobby', '未知')}",
        f"- 高考后是否有自主学习习惯: {base_info_dict.get('self_learning_after_gaokao', '未知')}",
        f"- 是否主动参加竞赛: {base_info_dict.get('proactive_in_competitions', '未知')}",
        f"- 是否喜欢阅读课外书: {base_info_dict.get('likes_reading_extracurricular_books', '未知')}"
    ])
    
    try:
        wisdom_report = await gen_wisdom_report(student_info, final_majors)
        logger.debug(f"wisdom_report: {wisdom_report}")
        report = Report(
            final_three_majors=wisdom_report.final_three_majors,
            final_three_majors_report=wisdom_report.final_three_majors_report,
            final_recommendation=wisdom_report.final_recommendation
        )
        
        await update_session(db, UpdateSession(session_id=session_id, current_round_number=session.current_round_number, report=report))
        
        return Report(
            final_three_majors=wisdom_report.final_three_majors,
            final_three_majors_report=wisdom_report.final_three_majors_report,
            final_recommendation=wisdom_report.final_recommendation
        )
    except Exception as e:
        logger.error(f"生成报告时发生错误: {e}")
        raise HTTPException(status_code=500, detail=f"生成报告失败: {str(e)}")
