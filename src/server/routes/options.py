from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger
import random
import json

from database.models import SessionStatus, RoundStatus, Round
from database.base import get_db
from database.crud import (
    UpdateSession, CreateRound, UpdateRound, 
    CreateChoice, UpdateChoice, 
    get_session, update_session, 
    create_round, update_round, create_choices, update_choices
)
from database.unit_of_work import UnitOfWork
from .jwt_utils import get_current_user
from schemas import UserInfo, Report, MajorChoiceRequest, PostChoicesResponse, GetChoicesResponse, GetRoundResponse, GenerrateType, ChoiceResponse
from llm import gen_majors_reveal, gen_wisdom_report

majors = {"计算机类", "心理学类", "教育学类", "历史学类", "医学", "文学", "数学类", "物理学类"}

# 专业静态子专业映射
MAJOR_TREE = {
    "计算机类": ["软件工程", "人工智能", "网络安全"],
    "心理学类": ["发展心理学", "临床心理学"],
    "教育学类": ["学前教育", "教育技术学"],
    "历史学类": ["考古学", "历史文献学"],
    "医学": ["临床医学", "口腔医学"],
    "文学": ["汉语言文学", "比较文学"],
    "数学类": ["应用数学", "统计学"],
    "物理学类": ["理论物理", "核物理"]
}

def get_next_majors(major_name: str) -> list[str]:
    """返回给定专业的子专业列表，如果没有则返回空列表"""
    return MAJOR_TREE.get(major_name, [])

def get_winners_and_next_majors(round: Round) -> tuple[list[str], list[str]]:
    """
    根据当前轮次确定胜出者和下一轮专业
    
    Args:
        round: 当前轮次对象
        
    Returns:
        tuple: (胜出者列表, 下一轮专业列表)
            - 如果有唯一胜出者且有子专业，返回 ([胜出者], [子专业列表])
            - 如果有唯一胜出者但无子专业，返回 ([胜出者], [])
            - 如果有多个胜出者，返回 ([胜出者列表], [胜出者列表])
    """
    # 获取当前轮次的胜出者（包括明确标记为胜出的和轮空晋级的）
    # 1. 获取已明确标记为胜出的专业
    explicit_winners = [choice.major_name for choice in round.appearances if choice.is_winner_in_comparison is True]
    
    # 2. 获取所有已参与比较的专业
    compared_majors = {choice.major_name for choice in round.appearances if choice.is_winner_in_comparison is not None}
    
    # 3. 获取未参与比较的专业（轮空的）
    uncompared_majors = set(round.current_round_majors) - compared_majors
    
    # 4. 合并明确胜出的和轮空的专业作为最终胜出者
    winners = explicit_winners + list(uncompared_majors)
    
    logger.debug(f"[get_winners_and_next_majors] 当前轮次明确胜出者: {explicit_winners}, 轮空专业: {uncompared_majors}, 最终胜出者: {winners}")
    
    # 如果只有一个胜出者，检查是否有子专业
    if len(winners) == 1:
        winner = winners[0]
        child_majors = get_next_majors(winner)
        logger.debug(f"[get_winners_and_next_majors] 唯一胜出者 {winner} 的子专业: {child_majors}")
        
        # 如果有子专业，下一轮使用子专业
        if child_majors:
            return winners, child_majors
        # 如果没有子专业，返回空列表作为下一轮专业，表示应该结束会话
        return winners, []
    
    # 如果有多个胜出者，下一轮使用这些胜出者
    logger.debug(f"[get_winners_and_next_majors] 多个胜出者: {winners}，下一轮将继续比较这些专业")
    return winners, winners

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
        
        update_choice_1, update_choice_2 = (UpdateChoice(uuid=choices.choices[0].major_id, is_winner_in_comparison=choices.choices[0].is_winner_in_comparison), 
                                            UpdateChoice(uuid=choices.choices[1].major_id, is_winner_in_comparison=choices.choices[1].is_winner_in_comparison))
        await update_choices(db, (update_choice_1, update_choice_2))
        
        updated_session = await get_session(db, session_id, user.id)
        last_round = updated_session.rounds[-1]
        
        if len(last_round.current_round_majors) == 2 and len(last_round.appearances) == 2:
            # 决胜，本层获胜专业
            winner_name = last_round.appearances[-1].major_name if last_round.appearances[-1].is_winner_in_comparison else last_round.appearances[-2].major_name
            # 判断是否有子专业
            child_majors = get_next_majors(winner_name)
            if child_majors:
                # 进入下一层
                await update_session(db, UpdateSession(session_id=session_id, current_round_number=last_round.round_number + 1))
                return PostChoicesResponse(generate_type=GenerrateType.ROUND)
            # 无子专业，结束并生成报告
            await update_session(db, UpdateSession(session_id=session_id, 
                                                   current_round_number=last_round.round_number + 1, 
                                                   status=SessionStatus.FINISHED, 
                                                   final_major_name=winner_name
                                                   ))
            return PostChoicesResponse(generate_type=GenerrateType.REPORT)
            
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
async def get_choices(session_id: str, db: AsyncSession = Depends(get_db), user: UserInfo = Depends(get_current_user), transaction=None) -> GetChoicesResponse:
    try:
        session = await get_session(db, session_id, user.id, transaction=transaction)
        
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
        
        new_choices = await create_choices(db, (major_1, major_2), user.id, transaction=transaction)
        
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
    
@options_router.get("/get_round/{session_id}", response_model=GetRoundResponse)
async def get_round(session_id: str, db: AsyncSession = Depends(get_db), user: UserInfo = Depends(get_current_user), transaction=None) -> GetRoundResponse:
    try:
        session = await get_session(db, session_id, user.id, transaction=transaction)
        base_info = session.base_information
        next_round_num = 1
        appearance_index_1 = 0
        appearance_index_2 = 1
        current_round_majors = list(majors)
        
        if len(session.rounds) >= 1:
            next_round_num = session.current_round_number + 1
            _, next_majors = get_winners_and_next_majors(session.rounds[-1])
            
            if next_majors:
                current_round_majors = next_majors
            else:
                # 如果没有下一轮专业，这种情况理论上不应该发生，因为应该已经生成报告
                logger.warning(f"[get_round] 警告：上一轮没有产生下一轮专业，但仍然调用了get_round")
                winners = [c.major_name for c in session.rounds[-1].appearances if c.is_winner_in_comparison]
                current_round_majors = winners if winners else list(majors)
            
        # 确保 current_round_majors 至少有两个元素，否则无法进行比较
        if len(current_round_majors) < 2:
            logger.error(f"[get_round] 错误：下一轮专业数量不足，无法进行比较: {current_round_majors}")
            raise HTTPException(status_code=400, detail=f"下一轮专业数量不足，无法进行比较: {current_round_majors}")
            
        round_create = CreateRound(session_id=session_id, round_number=next_round_num, current_round_majors=set(current_round_majors))
        session_update = UpdateSession(session_id=session_id, current_round_number=next_round_num)
        new_round = await create_round(db, round_create, transaction=transaction)
        await update_session(db, session_update, transaction=transaction)
        
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
        
        new_choices = await create_choices(db, (major_1, major_2), user.id, transaction=transaction)
        
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
        
@options_router.get("/gen_report/{session_id}", response_model=Report)
async def gen_report(session_id: str, user: UserInfo = Depends(get_current_user), db: AsyncSession = Depends(get_db), transaction=None) -> Report:
    """生成最终的报告"""
    logger.info(f"生成用户 {user.id} 的会话 {session_id} 的最终报告")
    
    session = await get_session(db, session_id, user.id, transaction=transaction)
    
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
        
        await update_session(db, UpdateSession(session_id=session_id, current_round_number=session.current_round_number, report=report), transaction=transaction)
        
        return Report(
            final_three_majors=wisdom_report.final_three_majors,
            final_three_majors_report=wisdom_report.final_three_majors_report,
            final_recommendation=wisdom_report.final_recommendation
        )
    except Exception as e:
        logger.error(f"生成报告时发生错误: {e}")
        raise HTTPException(status_code=500, detail=f"生成报告失败: {str(e)}")

@options_router.post("/save_and_next/{session_id}", response_model=dict)
async def save_choice_and_generate_next(
    session_id: str, 
    choice_request: MajorChoiceRequest,
    user: UserInfo = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    """
    整合API：保存用户选择并自动生成下一步（新选项/新一轮/报告）
    如果任何步骤失败将自动回滚
    """
    # 使用UnitOfWork模式管理事务
    async with UnitOfWork(db) as uow:
        try:
            # 步骤1: 判断是否是第一轮，如果是且没有选择，直接生成第一轮
            session = await get_session(db, session_id, user.id, transaction=uow.transaction)
            
            if len(session.rounds) == 0 and choice_request.choices is None:
                result = await get_round(session_id, db, user, transaction=uow.transaction)
                return {
                    "status": "success",
                    "operation": "GENERATE_ROUND",
                    "data": result
                }
            
            # 步骤2: 保存用户选择
            last_round_before = session.rounds[-1]
            logger.debug(f"[save_and_next] 更新前 last_round uuid={last_round_before.uuid}, appearances={last_round_before.appearances}, current_round_majors={last_round_before.current_round_majors}")
            choice_ids = [c.major_id for c in choice_request.choices]
            choice_results = [c.is_winner_in_comparison for c in choice_request.choices]
            logger.debug(f"[save_and_next] 将要更新的 choices: ids={choice_ids}, winners={choice_results}")
            if choice_request.choices:
                update_choice_1 = UpdateChoice(
                    uuid=choice_request.choices[0].major_id, 
                    is_winner_in_comparison=choice_request.choices[0].is_winner_in_comparison
                )
                update_choice_2 = UpdateChoice(
                    uuid=choice_request.choices[1].major_id, 
                    is_winner_in_comparison=choice_request.choices[1].is_winner_in_comparison
                )
                await update_choices(db, (update_choice_1, update_choice_2), transaction=uow.transaction)
                logger.debug("[save_and_next] update_choices 执行完毕")
            
            # 步骤3: 获取更新后的会话，判断下一步操作
            updated_session = await get_session(db, session_id, user.id, transaction=uow.transaction)
            last_round = updated_session.rounds[-1]
            
            # 检查是否需要生成报告（最后一轮）
            winners, next_majors = get_winners_and_next_majors(last_round)
            
            if len(next_majors) == 0:
                # 无子专业，结束并生成报告
                await update_session(db, UpdateSession(
                    session_id=session_id,
                    current_round_number=last_round.round_number + 1,
                    status=SessionStatus.FINISHED,
                    final_major_name=winners[0]
                ), transaction=uow.transaction)
                report_response = await gen_report(session_id, user, db, transaction=uow.transaction)
                return {
                    "status": "success",
                    "operation": "GENERATE_REPORT",
                    "data": report_response
                }
            
            # 辅助函数：获取未出现的专业
            def get_unappear_majors(round):
                appeared_majors = {choice.major_name for choice in round.appearances if choice.is_winner_in_comparison is not None}
                unappear_majors = set(round.current_round_majors) - appeared_majors
                return unappear_majors
            
            # 检查当前轮次是否已完成
            unappear_majors = get_unappear_majors(last_round)
            
            # 报错测试
            # raise Exception("测试报错")
            
            if len(unappear_majors) == 0 or len(unappear_majors) == 1:
                # 处理轮空晋级情况
                if len(unappear_majors) == 1:
                    remaining_major = list(unappear_majors)[0]
                    logger.debug(f"[save_and_next] auto-win remaining_major={remaining_major}")
                    auto_win_choice = CreateChoice(
                        round_id=last_round.uuid,
                        session_id=session_id,
                        major_name=remaining_major,
                        description=f"{remaining_major}轮空晋级",
                        appearance_index=len(last_round.appearances)
                    )
                    new_choices = await create_choices(db, (auto_win_choice, auto_win_choice), user.id, transaction=uow.transaction)
                    logger.debug(f"[save_and_next] create_choices 返回 new_choices uuids={[c.uuid for c in new_choices]}")
                    auto_win_update = UpdateChoice(
                        uuid=new_choices[0].uuid,
                        is_winner_in_comparison=True
                    )
                    logger.debug(f"[save_and_next] auto-win update_choices 将更新 uuid={new_choices[0].uuid}")
                    await update_choices(db, (auto_win_update, auto_win_update), transaction=uow.transaction)
                    logger.debug("[save_and_next] auto-win update_choices 执行完毕")
                
                # 更新轮次状态
                round_update = UpdateRound(round_id=last_round.uuid, status=RoundStatus.COMPLETED)
                await update_round(db, round_update, transaction=uow.transaction)
                
                # 获取更新后的轮次，以便确定胜出者和下一步操作
                updated_round = (await get_session(db, session_id, user.id, transaction=uow.transaction)).rounds[-1]
                winners, next_majors = get_winners_and_next_majors(updated_round)
                logger.debug(f"[save_and_next] 轮次完成后，胜出者: {winners}, 下一轮专业: {next_majors}")
                
                # 根据下一轮专业情况决定下一步操作
                if next_majors:
                    # 有下一轮专业，生成新一轮
                    new_round = await get_round(session_id, db, user, transaction=uow.transaction)
                    return {
                        "status": "success",
                        "operation": "GENERATE_ROUND",
                        "data": new_round
                    }
                else:
                    # 无下一轮专业，结束并生成报告
                    await update_session(db, UpdateSession(
                        session_id=session_id,
                        current_round_number=last_round.round_number + 1,
                        status=SessionStatus.FINISHED,
                        final_major_name=winners[0] if winners else None
                    ), transaction=uow.transaction)
                    report_response = await gen_report(session_id, user, db, transaction=uow.transaction)
                    return {
                        "status": "success",
                        "operation": "GENERATE_REPORT",
                        "data": report_response
                    }
            
            # 默认情况：生成新选项
            choices_response = await get_choices(session_id, db, user, transaction=uow.transaction)
            
            return {
                "status": "success",
                "operation": "GENERATE_CHOICES",
                "data": choices_response
            }
        
        except Exception as e:
            # UnitOfWork会自动回滚事务
            logger.error(f"保存选择和生成下一步操作失败: {str(e)}")
            raise HTTPException(
                status_code=500, 
                detail=f"操作失败并已回滚: {str(e)}"
            )
