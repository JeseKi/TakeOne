from sqlalchemy import create_engine, Column, Integer, String, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship

from pydantic import BaseModel

DATABASE_URL = "sqlite:///./sessions.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
  db = SessionLocal()
  try:
    yield db
  finally:
    db.close()

Base = declarative_base()

### 数据库模型

class Choice(Base):
    __tablename__ = "choices"
    uuid = Column(String, primary_key=True, index=True)
    user_id = Column(Integer)  # UserID使用Casdoor中的
    session_id = Column(String, ForeignKey("sessions.uuid"))
    major_name = Column(String)
    descriptions = Column(String) # 因为要经过多轮筛选，而每一次筛选时该选项出现时的描述均不同，要和sequence一一对应。每个描述间使用`</-|-\>`分隔
    chosen_sequence = Column(String) # 同样的，因为要经过多轮筛选，所以用一个sequence来记录这个专业出现的顺序，便于前端展示，同时自带了chosen_count的数据。

    session = relationship("Session", back_populates="choices_list")

class Session(Base):
    __tablename__ = "sessions"
    uuid = Column(String, primary_key=True, index=True)
    user_id = Column(Integer)  # UserID使用Casdoor中的
    base_information = Column(String) # 基本信息的json
    report = Column(String) # 最终生成的报告

    choices_list = relationship("Choice", back_populates="session")
    
### 数据库更新模型

class CreateSession(BaseModel):
    user_id: int
    base_information: str
    
class CreateChoice(BaseModel):
    user_id: int
    session_id: str
    major_name: str
    descriptions: str
    chosen_sequence: str
    
class UpdateChoice(BaseModel):
    uuid: str
    description: str
    chosen_sequence: str
    
class CreateReport(BaseModel):
    session_id: str
    report: str
    
### 创建数据库

Base.metadata.create_all(bind=engine)