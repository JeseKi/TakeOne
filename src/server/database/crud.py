from typing import List, Set, Tuple
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from sqlalchemy.exc import SQLAlchemyError
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from pydantic import BaseModel

from loguru import logger
from database.models import ChoiceAppearance, Session, Round, RoundStatus, SessionStatus
from schemas import BaseInformation, Report
from common import timeout

class CreateSession(BaseModel):
    user_id: str
    base_information: BaseInformation
    
class UpdateSession(BaseModel):
    session_id: str
    current_round_number: int
    final_major_name: str | None = None
    status: SessionStatus | None = SessionStatus.ONGOING
    report: Report | None = None
    
class CreateRound(BaseModel):
    session_id: str
    round_number: int
    current_round_majors: Set[str]
    
class UpdateRound(BaseModel):
    round_id: str
    status: RoundStatus
    
class CreateChoice(BaseModel):
    round_id: str
    session_id: str
    major_name: str
    description: str
    appearance_index: int
    
class UpdateChoice(BaseModel):
    uuid: str
    is_winner_in_comparison: bool
    
class CreateReport(BaseModel):
    session_id: str
    report: str
    
    
### CRUD

@timeout()
async def create_session(db: AsyncSession, session: CreateSession) -> Session:
    try:
        new_session = Session(
            uuid=str(uuid.uuid4()),  # 手动设置UUID
            user_id=session.user_id, 
            base_information=session.base_information.model_dump_json(),
            final_major_name=None
            )
        db.add(new_session)
        await db.commit()
        await db.refresh(new_session)
        return new_session
    except SQLAlchemyError as e:
        await db.rollback()
        logger.error(f"数据库错误:{str(e)}")
        raise HTTPException(status_code=500, detail=f"数据库错误: {str(e)}")
    finally:
        await db.close()

@timeout()
async def get_session(db: AsyncSession, session_id: str, user_id: str, transaction=None) -> Session:
    try:
        query = (
            select(Session).
            where(Session.uuid == session_id).
            options(joinedload(Session.rounds).joinedload(Round.appearances))
            )
        
        result = await db.execute(query)
        session = result.scalar()
        if not session or session.user_id != user_id:
            logger.error(f"未找到指定的会话: {session_id}, user_id: {user_id}")
            raise HTTPException(status_code=404, detail="未找到指定的会话")
        return session
    except SQLAlchemyError as e:
        logger.error(f"数据库错误:{str(e)}")
        if transaction is None:
            await db.rollback()
        raise
    finally:
        # 只有在没有外部事务的情况下才关闭连接
        if transaction is None:
            await db.close()

@timeout()
async def get_sessions(db: AsyncSession, user_id: str) -> List[str]:
    try:
        query = select(Session).where(Session.user_id == user_id)
        result = await db.execute(query)
        sessions = result.scalars().all()
        session_id = [session.uuid for session in sessions]
        
        return session_id
    except SQLAlchemyError as e:
        await db.rollback()
        logger.error(f"数据库错误:{str(e)}")
        raise HTTPException(status_code=500, detail=f"数据库错误: {str(e)}")
    finally:
        await db.close()
        
@timeout()
async def update_session(db: AsyncSession, session_update: UpdateSession, transaction=None) -> Session:
    try:
        query = select(Session).where(Session.uuid == session_update.session_id)
        result = await db.execute(query)
        session = result.scalar()
        if not session:
            raise HTTPException(status_code=404, detail="未找到指定的会话")
        
        session.current_round_number = session_update.current_round_number
        session.final_major_name = session_update.final_major_name
        session.status = session_update.status
        if session_update.report:
            session.report = session_update.report.model_dump()
        db.add(session)
        
        # 只有在没有外部事务的情况下才提交
        if transaction is None:
            await db.commit()
            await db.refresh(session)
        return session
    except SQLAlchemyError as e:
        # 只有在没有外部事务的情况下才回滚
        if transaction is None:
            await db.rollback()
        logger.error(f"数据库错误:{str(e)}")
        raise HTTPException(status_code=500, detail=f"数据库错误: {str(e)}")
    finally:
        # 只有在没有外部事务的情况下才关闭连接
        if transaction is None:
            await db.close()

@timeout()
async def create_round(db: AsyncSession, round: CreateRound, transaction=None) -> Round:
    try:
        current_round_majors_list = list(round.current_round_majors)
        
        new_round = Round(
            uuid=str(uuid.uuid4()),  # 手动设置UUID
            session_id=round.session_id,
            round_number=round.round_number,
            current_round_majors=current_round_majors_list
        )
        db.add(new_round)
        
        # 只有在没有外部事务的情况下才提交
        if transaction is None:
            await db.commit()
            await db.refresh(new_round)
        
        return new_round
    except Exception as e:
        # 只有在没有外部事务的情况下才回滚
        if transaction is None:
            await db.rollback()
        logger.error(f"数据库错误:{str(e)}")
        raise HTTPException(status_code=500, detail=f"数据库错误: {str(e)}")
    finally:
        # 只有在没有外部事务的情况下才关闭连接
        if transaction is None:
            await db.close()

@timeout()
async def update_round(db: AsyncSession, round_update: UpdateRound, transaction=None) -> Round:
    try:
        query = select(Round).where(Round.uuid == round_update.round_id)
        result = await db.execute(query)
        round = result.scalar()
        if not round:
            raise HTTPException(status_code=404, detail="未找到指定的轮次")
        
        round.status = round_update.status
        db.add(round)
        
        # 只有在没有外部事务的情况下才提交
        if transaction is None:
            await db.commit()
            await db.refresh(round)
        return round
    except SQLAlchemyError as e:
        # 只有在没有外部事务的情况下才回滚
        if transaction is None:
            await db.rollback()
        logger.error(f"数据库错误:{str(e)}")
        raise HTTPException(status_code=500, detail=f"数据库错误: {str(e)}")
    finally:
        # 只有在没有外部事务的情况下才关闭连接
        if transaction is None:
            await db.close()

@timeout()
async def create_choices(db: AsyncSession, choices: Tuple[CreateChoice, CreateChoice], user_id: str, transaction=None) -> Tuple[ChoiceAppearance, ChoiceAppearance]:
    new_choices = []
    try:
        for choice in choices:
            query = select(Session).where(Session.uuid == choice.session_id)
            result = await db.execute(query)
            session = result.scalar()
            if not session or session.user_id != user_id:
                raise HTTPException(status_code=404, detail="未找到指定的会话")
            
            new_choice = ChoiceAppearance(
                uuid=str(uuid.uuid4()),  
                round_id=choice.round_id,
                session_id=choice.session_id, 
                major_name=choice.major_name, 
                description=choice.description, 
                appearance_index=choice.appearance_index
            )
            new_choices.append(new_choice)
            db.add(new_choice)
        
        # 只有在没有外部事务的情况下才提交
        if transaction is None:
            await db.commit()
            for choice in new_choices:
                await db.refresh(choice)
        return new_choices[:2]
    except SQLAlchemyError as e:
        # 只有在没有外部事务的情况下才回滚
        if transaction is None:
            await db.rollback()
        logger.error(f"数据库错误:{str(e)}")
        raise HTTPException(status_code=500, detail=f"数据库错误: {str(e)}")
    finally:
        # 只有在没有外部事务的情况下才关闭连接
        if transaction is None:
            await db.close()

@timeout()
async def update_choices(db: AsyncSession, new_choices: Tuple[UpdateChoice, UpdateChoice], transaction=None) -> Tuple[ChoiceAppearance, ChoiceAppearance]:
    updated_choices = []
    try:
        for new_choice in new_choices:
            query = select(ChoiceAppearance).where(ChoiceAppearance.uuid == new_choice.uuid)
            result = await db.execute(query)
            choice = result.scalar()
            if not choice:
                raise HTTPException(status_code=404, detail="未找到指定的选择记录")
            
            choice.is_winner_in_comparison = new_choice.is_winner_in_comparison
            updated_choices.append(choice)
            db.add(choice)
        
        # 只有在没有外部事务的情况下才提交
        if transaction is None:
            await db.commit()
            for choice in updated_choices:
                await db.refresh(choice)
        return updated_choices
    except SQLAlchemyError as e:
        # 只有在没有外部事务的情况下才回滚
        if transaction is None:
            await db.rollback()
        logger.error(f"数据库错误:{str(e)}")
        raise HTTPException(status_code=500, detail=f"数据库错误: {str(e)}")
    finally:
        # 只有在没有外部事务的情况下才关闭连接
        if transaction is None:
            await db.close()