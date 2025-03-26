import asyncio
import json
import random
from typing import List
from fastapi import Depends, FastAPI, HTTPException
from fastapi.concurrency import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from database import CreateChoice, CreateSession, Session, create_choices, create_session, get_db, get_session, get_sessions, init_db
from jwt_utils import cleanup_expired_states, get_current_user, jwt_router
from config import SECRET_KEY
from llm import MajorsReveal, gen_majors_reveal
from models import BaseInformation, Major, MajorChoice, SessionContentResponse, UserInfo

origins = [
    "http://localhost:3000", 
    "http://localhost:8080",
    "https://ki-test-frontend.kispace.cc",
]

majors = ["计算机类", "心理学类", "教育学类", "历史学类", "医学", "文学", "数学类", "物理学类"]

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("SelfKnowing启动中...")
    asyncio.create_task(cleanup_expired_states())
    await init_db()
    logger.info("SelfKnowing已启动")
    yield
    logger.info("SelfKnowing关闭中...")
    
app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],  
)
app.add_middleware(SessionMiddleware, secret_key=SECRET_KEY)

app.include_router(jwt_router, prefix="/api/auth")

@app.post("/api/base_information", response_model=str)
async def base_information(info: BaseInformation, user: UserInfo = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> str:
    """收集这名高中生的基本信息，并创建一个新的会话

    Args:
        info (BaseInformation): 基本信息的json
        user (dict, optional): JWT认证的用户信息. Defaults to Depends(get_current_user).

    Returns:
        str: 会话id
    """
    try:
        user_id: str = user.id
        new_session_info: CreateSession = CreateSession(user_id=user_id, base_information=info)
        new_session:Session = await create_session(db, new_session_info)
        return new_session.uuid
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@app.get("/api/sessions", response_model=List[str])
async def sessions_get(user: UserInfo = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> List[str]:
    """拉取这个高中生的所有的会话

    Args:
        user (dict, optional): JWT认证的用户信息. Defaults to Depends(get_current_user).

    Returns:
        List[str]: 所有的会话id
    """
    try:
        user_id: str = user.id
        sessions_id: str = await get_sessions(db, user_id)
        return sessions_id
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@app.get("/api/sessions/{session_id}", response_model=SessionContentResponse)
async def session_get(session_id: str, user: UserInfo = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """拉取这个高中生的特定会话的信息

    Args:
        session_id (str): 会话 ID
        user (UserInfo, optional): JWT认证的用户信息. Defaults to Depends(get_current_user).

    Returns:
        SessionInfoResponse: 具体的会话信息
    """
    try:
        user_id: str = user.id
        
        session: Session = await get_session(db, session_id, user_id)
        base_info = BaseInformation(**json.loads(session.base_information))
        
        session_response = SessionContentResponse(
            base_information=base_info,
            major_choices_result=session.choices_list
        )
        
        return session_response
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@app.post("/api/gen_options/{session_id}", response_model=MajorChoice)
async def gen_options(session_id:str, 
                      choices: List[MajorChoice],
                      base_infomation: BaseInformation,  
                      user: UserInfo = Depends(get_current_user),
                      db: AsyncSession = Depends(get_db),
                      ) -> MajorChoice:
    """让大模型生成选项并返回

    Args:
        session_id (str): 会话id
        choice (MajorChoice): 上一轮的选项结果
        user (dict, optional): JWT认证的用户信息. Defaults to Depends(get_current_user).

    Returns:
        MajorChoice: 大语言模型生成的选项
    """
    try:
        user_id: str = user.id
        max_order = len(choices)
        selected_choices_name: List[str] = []
        logger.debug("Generating new options")
        
        for choice in choices:
            selected_choices_name.append(choice.major_a)
            selected_choices_name.append(choice.major_b)    
        can_select_majors = list(set(majors) - set(selected_choices_name))
        
        if len(can_select_majors) == 0:
            return MajorChoice(major_a=None, major_b=None, need_gen_report=True)
        
        if len(can_select_majors) == 1:
            major_name = can_select_majors[0]
            major_description = await gen_majors_reveal(base_infomation.model_dump_json(indent=4), major_name, selected_choices_name[0])
            create_choice_content = CreateChoice(
                user_id=user_id,
                session_id=session_id,
                name=major_name,
                descriptions=major_description,
                appearance_order=max_order + 1
            )
            await create_choices(db, [create_choice_content])
            major = Major(name=major_name, description=major_description)
            return MajorChoice(major_a=major, major_b=None)
            
        major_a_name, major_b_name = random.sample(can_select_majors, 2)
        logger.debug(f"Major A: {major_a_name}, Major B: {major_b_name}")
        majors_reval: MajorsReveal = await gen_majors_reveal(base_infomation.model_dump_json(indent=4), major_a_name, major_b_name)
        logger.debug(f"Major A: {majors_reval.major_a_description}, Major B: {majors_reval.major_b_description}")
        major_a = Major(name=major_a_name, description=majors_reval.major_a_description)
        major_b = Major(name=major_b_name, description=majors_reval.major_b_description)
        
        create_choice_a = CreateChoice(
            user_id=user_id,
            session_id=session_id,
            name=major_a_name,
            descriptions=majors_reval.major_a_description,
            appearance_order=max_order
        )
        create_choice_b = CreateChoice(
            user_id=user_id,
            session_id=session_id,
            name=major_b_name,
            descriptions=majors_reval.major_b_description,
            appearance_order=max_order+1
        )
        
        await create_choices(db, [create_choice_a, create_choice_b])
        
        return MajorChoice(major_a=major_a, major_b=major_b)
            
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    
@app.post("/api/gen_report/{session_id}")
async def gen_report(session_id: str, user: UserInfo = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """生成最终的报告"""
    # TODO: 生成最终的报告
    pass