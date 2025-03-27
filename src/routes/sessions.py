import json
from typing import List

from fastapi import Depends, HTTPException, APIRouter
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from database.crud import CreateSession, Session, create_session, get_session, get_sessions
from database.base import get_db
from routes.jwt_utils import get_current_user
from schemas import BaseInformation, ChoiceResponse, RoundResponse, SessionResponse, UserInfo
    
sessions_router = APIRouter()

@sessions_router.post("/base_information", response_model=str)
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

@sessions_router.get("/sessions", response_model=List[str])
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

@sessions_router.get("/sessions/{session_id}", response_model=SessionResponse)
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
        status = session.status
        current_round_number = session.current_round_number
        final_major_name = session.final_major_name
        rounds = []
        for round in session.rounds:
            appearances = []
            for appearance in round.appearances:
                appearances.append(
                    ChoiceResponse(
                        major_id=appearance.uuid,
                        major_name=appearance.major_name,
                        description=appearance.description,
                        appearance_index=appearance.appearance_index,
                        is_winner_in_comparison=appearance.is_winner_in_comparison
                    )
                )
            rounds.append(
                RoundResponse(
                    round_number=round.round_number,
                    status=round.status,
                    current_round_majors=round.current_round_majors,
                    appearances=appearances
                )
            )
        
        session_response = SessionResponse(
            base_information=base_info,
            status=status,
            current_round_number=current_round_number,
            final_major_name=final_major_name,
            rounds=rounds
        )
        
        return session_response
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")