from typing import List
from uuid import uuid4
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from sqlalchemy.exc import SQLAlchemyError
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from pydantic import BaseModel

from loguru import logger
from database.models import Choice, Session
from schemas import BaseInformation

class CreateSession(BaseModel):
    user_id: str
    base_information: BaseInformation
    
class CreateChoice(BaseModel):
    user_id: str
    session_id: str
    name: str
    descriptions: str
    appearance_order: int
    
class UpdateChoice(BaseModel):
    uuid: str
    description: str
    appearance_order: int
    
class UpdateSession(BaseModel):
    session_id: str
    chosen_order: List[int]
    
class CreateReport(BaseModel):
    session_id: str
    report: str
    
    
### CRUD

async def create_session(db: AsyncSession, session: CreateSession) -> Session:
    try:
        uuid = str(uuid4())
        new_session = Session(uuid=uuid, user_id=session.user_id, base_information=session.base_information.model_dump_json(), report=None, chosen_order=None)
        db.add(new_session)
        await db.commit()
        await db.refresh(new_session)
        return new_session
    except SQLAlchemyError as e:
        await db.rollback()
        logger.error(f"数据库错误:{str(e)}")
        raise HTTPException(status_code=500, detail=f"数据库错误: {str(e)}")
    finally:
        db.close()

async def get_session(db: AsyncSession, session_id: str, user_id: str) -> Session:
    try:
        query = (
            select(Session).
            where(Session.uuid == session_id).
            options(joinedload(Session.choices_list))
            )
        
        result = await db.execute(query)
        session = result.scalar()
        if not session or session.user_id != user_id:
            raise HTTPException(status_code=404, detail="未找到指定的会话")
        return session
    except SQLAlchemyError as e:
        logger.error(f"数据库错误:{str(e)}")
        await db.rollback()

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
    
async def update_session(db: AsyncSession, session: UpdateSession):
    pass

async def create_choices(db: AsyncSession, choices: List[CreateChoice]) -> Choice:
    new_choices = []
    try:
        for choice in choices:
            uuid = str(uuid4())
            new_choice = Choice(
                uuid=uuid, 
                user_id=choice.user_id, 
                session_id=choice.session_id, 
                major_name=choice.name, 
                descriptions=choice.descriptions, 
                appearance_order=choice.appearance_order
            )
            new_choices.append(new_choice)
            db.add(new_choice)
            
        await db.commit()
        for choice in new_choices:
            await db.refresh(choice)
        return new_choices
    except SQLAlchemyError as e:
        await db.rollback()
        logger.error(f"数据库错误:{str(e)}")
        raise HTTPException(status_code=500, detail=f"数据库错误: {str(e)}")
    finally:
        db.close()

async def update_choice(db: AsyncSession, new_choice: UpdateChoice):
    try:
        choice = db.query(Choice).filter(Choice.uuid == new_choice.uuid).first()
        if not choice:
            raise HTTPException(status_code=404, detail="未找到指定的选择记录")
            
        descriptions: List[str] = choice.descriptions.split("</-|-\>")
        descriptions.append(new_choice.description)
        choice.descriptions = "</-|-\>".join(descriptions)
        
        order: List[str] = choice.appearance_order.split(",")
        order.append(str(new_choice.appearance_order))
        choice.appearance_order = ",".join(order)
        
        await db.commit()
        await db.refresh(choice)
        return choice
    except SQLAlchemyError as e:
        await db.rollback()
        logger.error(f"数据库错误:{str(e)}")
        raise HTTPException(status_code=500, detail=f"数据库错误: {str(e)}")
    finally:
        db.close()

async def create_report(db: AsyncSession, report: CreateReport):
    try:
        session = db.query(Session).filter(Session.uuid == report.session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="未找到指定的会话")
            
        session.report = report.report
        await db.commit()
        await db.refresh(session)
        return session
    except SQLAlchemyError as e:
        await db.rollback()
        logger.error(f"数据库错误:{str(e)}")
        raise HTTPException(status_code=500, detail=f"数据库错误: {str(e)}")
    finally:
        db.close()

async def delete_session(db: AsyncSession, session_id: str):
    try:
        result = db.query(Session).filter(Session.uuid == session_id).delete()
        if not result:
            raise HTTPException(status_code=404, detail="未找到指定的会话")
        await db.commit()
        return True
    except SQLAlchemyError as e:
        await db.rollback()
        logger.error(f"数据库错误:{str(e)}")
        raise HTTPException(status_code=500, detail=f"数据库错误: {str(e)}")
    finally:
        db.close()