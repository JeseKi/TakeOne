from typing import List
from uuid import uuid4
from sqlalchemy import Column, String, ForeignKey, select
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.exc import SQLAlchemyError
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

from pydantic import BaseModel

from logger import LogLevel, event_time_log
from models import BaseInformationRequest

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
    major_name = Column(String)
    descriptions = Column(String) # 因为要经过多轮筛选，而每一次筛选时该选项出现时的描述均不同，要和sequence一一对应。每个描述间使用`</-|-\>`分隔
    chosen_sequence = Column(String) # 同样的，因为要经过多轮筛选，所以用一个sequence来记录这个专业出现的顺序，便于前端展示，同时自带了chosen_count的数据。

    session = relationship("Session", back_populates="choices_list")

class Session(Base):
    __tablename__ = "sessions"
    uuid = Column(String, primary_key=True, index=True)
    user_id = Column(String)  # UserID使用Casdoor中的
    base_information = Column(String) # 基本信息的json
    report = Column(String, nullable=True) # 最终生成的报告

    choices_list = relationship("Choice", back_populates="session", cascade="all, delete, delete-orphan")
    
### 数据库模型

class CreateSession(BaseModel):
    user_id: str
    base_information: BaseInformationRequest
    
class CreateChoice(BaseModel):
    user_id: str
    session_id: str
    major_name: str
    descriptions: str
    chosen_sequence: int
    
class UpdateChoice(BaseModel):
    uuid: str
    description: str
    chosen_sequence: int
    
class CreateReport(BaseModel):
    session_id: str
    report: str

### CRUD

async def get_sessions(db: AsyncSession, user_id: str) -> List[str]:
    try:
        query = select(Session).where(Session.user_id == user_id)
        result = await db.execute(query)
        sessions = result.scalars().all()
        session_id = [session.uuid for session in sessions]
        
        return session_id
    except SQLAlchemyError as e:
        db.rollback()
        event_time_log(f"数据库错误:{str(e)}", LogLevel.ERROR)
        raise HTTPException(status_code=500, detail=f"数据库错误: {str(e)}")

async def create_session(db: AsyncSession, session: CreateSession) -> str:
    try:
        uuid = str(uuid4())
        new_session = Session(uuid=uuid, user_id=session.user_id, base_information=session.base_information.model_dump_json(), report=None)
        db.add(new_session)
        await db.commit()
        await db.refresh(new_session)
        return new_session
    except SQLAlchemyError as e:
        db.rollback()
        event_time_log(f"数据库错误:{str(e)}", LogLevel.ERROR)
        raise HTTPException(status_code=500, detail=f"数据库错误: {str(e)}")
    finally:
        db.close()

async def create_choice(db: AsyncSession, choice: CreateChoice):
    try:
        uuid = str(uuid4())
        new_choice = Choice(uuid=uuid, 
                          user_id=choice.user_id, 
                          session_id=choice.session_id, 
                          major_name=choice.major_name, 
                          descriptions=choice.descriptions, 
                          chosen_sequence=choice.chosen_sequence
                          )
        db.add(new_choice)
        await db.commit()
        await db.refresh(new_choice)
        return new_choice
    except SQLAlchemyError as e:
        db.rollback()
        event_time_log(f"数据库错误:{str(e)}", LogLevel.ERROR)
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
        
        sequence: List[str] = choice.chosen_sequence.split(",")
        sequence.append(str(new_choice.chosen_sequence))
        choice.chosen_sequence = ",".join(sequence)
        
        await db.commit()
        await db.refresh(choice)
        return choice
    except SQLAlchemyError as e:
        db.rollback()
        event_time_log(f"数据库错误:{str(e)}", LogLevel.ERROR)
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
        db.rollback()
        event_time_log(f"数据库错误:{str(e)}", LogLevel.ERROR)
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
        db.rollback()
        event_time_log(f"数据库错误:{str(e)}", LogLevel.ERROR)
        raise HTTPException(status_code=500, detail=f"数据库错误: {str(e)}")
    finally:
        db.close()

### 创建数据库

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)