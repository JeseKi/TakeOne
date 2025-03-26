from sqlalchemy import JSON, Column, String, ForeignKey
from sqlalchemy.orm import relationship

from database.base import Base

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