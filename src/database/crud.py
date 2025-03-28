from typing import List, Set, Tuple
from uuid import uuid4
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from sqlalchemy.exc import SQLAlchemyError
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from pydantic import BaseModel

from loguru import logger
from database.models import ChoiceAppearance, Session, Round, RoundStatus
from schemas import BaseInformation

class CreateSession(BaseModel):
    user_id: str
    base_information: BaseInformation
    
class UpdateSession(BaseModel):
    session_id: str
    final_major_name: str
    
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

async def create_session(db: AsyncSession, session: CreateSession) -> Session:
    try:
        new_session = Session(
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

async def get_session(db: AsyncSession, session_id: str, user_id: str) -> Session:
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
        await db.rollback()
    finally:
        await db.close()

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
        
async def update_session(db: AsyncSession, session: UpdateSession) -> Session:
    try:
        query = select(Session).where(Session.uuid == session.session_id)
        result = await db.execute(query)
        session = result.scalar()
        if not session:
            raise HTTPException(status_code=404, detail="未找到指定的会话")
        
        session.final_major_name = session.final_major_name
        db.add(session)
        await db.commit()
        await db.refresh(session)
        return session
    except SQLAlchemyError as e:
        await db.rollback()
        logger.error(f"数据库错误:{str(e)}")
        raise HTTPException(status_code=500, detail=f"数据库错误: {str(e)}")
    finally:
        await db.close()

async def create_round(db: AsyncSession, round: CreateRound) -> Round:
    try:
        current_round_majors_list = list(round.current_round_majors)
        
        new_round = Round(
            session_id=round.session_id,
            round_number=round.round_number,
            current_round_majors=current_round_majors_list
        )
        db.add(new_round)
        await db.commit()
        await db.refresh(new_round)
        
        return new_round
    except Exception as e:
        await db.rollback()
        logger.error(f"数据库错误:{str(e)}")
        raise HTTPException(status_code=500, detail=f"数据库错误: {str(e)}")
    finally:
        await db.close()
        
async def update_round(db: AsyncSession, round_update: UpdateRound) -> Round:
    try:
        query = select(Round).where(Round.uuid == UpdateRound.round_id)
        result = await db.execute(query)
        round = result.scalar()
        if not round:
            raise HTTPException(status_code=404, detail="未找到指定的轮次")
        
        round.status = UpdateRound.status
        db.add(round)
        await db.commit()
        await db.refresh(round)
        return round
    except SQLAlchemyError as e:
        await db.rollback()
        logger.error(f"数据库错误:{str(e)}")
        raise HTTPException(status_code=500, detail=f"数据库错误: {str(e)}")
    finally:
        await db.close()

async def create_choices(db: AsyncSession, choices: Tuple[CreateChoice, CreateChoice], user_id: str) -> Tuple[ChoiceAppearance, ChoiceAppearance]:
    new_choices = []
    try:
        for choice in choices:
            query = select(Session).where(Session.uuid == choice.session_id)
            result = await db.execute(query)
            session = result.scalar()
            if not session or session.user_id != user_id:
                raise HTTPException(status_code=404, detail="未找到指定的会话")
            
            new_choice = ChoiceAppearance(
                round_id=choice.round_id,
                session_id=choice.session_id, 
                major_name=choice.major_name, 
                description=choice.description, 
                appearance_index=choice.appearance_index
            )
            new_choices.append(new_choice)
            db.add(new_choice)
            
        await db.commit()
        for choice in new_choices:
            await db.refresh(choice)
        return new_choices[:2]
    except SQLAlchemyError as e:
        await db.rollback()
        logger.error(f"数据库错误:{str(e)}")
        raise HTTPException(status_code=500, detail=f"数据库错误: {str(e)}")
    finally:
        await db.close()

async def update_choices(db: AsyncSession, new_choices: Tuple[UpdateChoice, UpdateChoice]) -> ChoiceAppearance:
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
        
        await db.commit()
        for choice in updated_choices:
            await db.refresh(choice)
        return updated_choices
    except SQLAlchemyError as e:
        await db.rollback()
        logger.error(f"数据库错误:{str(e)}")
        raise HTTPException(status_code=500, detail=f"数据库错误: {str(e)}")
    finally:
        await db.close()

async def create_report(db: AsyncSession, report: CreateReport):
    try:
        pass
    except SQLAlchemyError as e:
        await db.rollback()
        logger.error(f"数据库错误:{str(e)}")
        raise HTTPException(status_code=500, detail=f"数据库错误: {str(e)}")
    finally:
        await db.close()

async def delete_session(db: AsyncSession, session_id: str):
    try:
        pass
    except SQLAlchemyError as e:
        await db.rollback()
        logger.error(f"数据库错误:{str(e)}")
        raise HTTPException(status_code=500, detail=f"数据库错误: {str(e)}")
    finally:
        await db.close()