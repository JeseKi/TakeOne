from typing import List
from uuid import uuid4
from sqlalchemy import JSON, Column, String, ForeignKey, select
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship, joinedload
from sqlalchemy.exc import SQLAlchemyError
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

from pydantic import BaseModel

from loguru import logger
from models import BaseInformation

DATABASE_URL = "sqlite+aiosqlite:///./sessions.db"

engine = create_async_engine(
    DATABASE_URL, 
    echo=True, 
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    )

AsyncSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    class_=AsyncSession,
)

async def get_db():
    async with AsyncSessionLocal() as db:
        try:
            yield db
        except Exception as e:
            await db.rollback()
            raise
        finally:
            await db.close()

Base = declarative_base()

### 数据库模型

class Choice(Base):
    __tablename__ = "choices"
    uuid = Column(String, primary_key=True, index=True)
    user_id = Column(String)  # UserID使用Casdoor中的
    session_id = Column(String, ForeignKey("sessions.uuid"))
    name = Column(String)
    descriptions = Column(String) # 因为要经过多轮筛选，而每一次筛选时该选项出现时的描述均不同，要和sequence一一对应。每个描述间使用`</-|-\>`分隔
    appearance_order = Column(String) # 同样的，因为要经过多轮筛选，所以用一个sequence来记录这个专业出现的顺序，便于前端展示，同时自带了chosen_count的数据。

    session = relationship("Session", back_populates="choices_list")

class Session(Base):
    __tablename__ = "sessions"
    uuid = Column(String, primary_key=True, index=True)
    user_id = Column(String)  # UserID使用Casdoor中的
    base_information = Column(JSON)
    report = Column(String, nullable=True)
    chosen_order = Column(String, nullable=True) # 用于记录用户的选择顺序，用`,`分隔

    choices_list = relationship("Choice", back_populates="session", cascade="all, delete, delete-orphan")
    
### 数据库模型

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
        
        order: List[str] = choice.chosen_sequence.split(",")
        order.append(str(new_choice.appearance_order))
        choice.chosen_sequence = ",".join(order)
        
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

### 创建数据库

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)