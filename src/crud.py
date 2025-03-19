from sqlalchemy import create_engine, Column, Integer, String, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship

DATABASE_URL = "sqlite:///./sessions.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class Choice(Base):
    __tablename__ = "choices"
    uuid = Column(String, primary_key=True, index=True)
    user_id = Column(Integer)  # UserID使用Casdoor中的
    session_id = Column(String, ForeignKey("sessions.uuid"))
    major_name = Column(String)
    descriptions = Column(String)
    chosen_sequence = Column(String)

    session = relationship("Session", back_populates="choices_list")

class Session(Base):
    __tablename__ = "sessions"
    uuid = Column(String, primary_key=True, index=True)
    user_id = Column(Integer)  # UserID使用Casdoor中的
    content = Column(String)

    choices_list = relationship("Choice", back_populates="session")

Base.metadata.create_all(bind=engine)