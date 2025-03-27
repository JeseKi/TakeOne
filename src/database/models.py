from typing import List
import uuid
import enum
from sqlalchemy import (
    Integer, String, Boolean, Enum as SqlEnum,
    ForeignKey, Text
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.sqlite import JSON

from .base import Base

class SessionStatus(str, enum.Enum):
    ONGOING = "ongoing"
    FINISHED = "finished"

class RoundStatus(str, enum.Enum):
    ACTIVE = "active"
    COMPLETED = "completed"

class ComparisonStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"

class ChoiceAppearance(Base):
    __tablename__ = "choice_appearances"

    uuid: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    round_id: Mapped[str] = mapped_column(String, ForeignKey("rounds.uuid", ondelete="CASCADE"), nullable=False, index=True)
    session_id: Mapped[str] = mapped_column(String, ForeignKey("sessions.uuid", ondelete="CASCADE"), nullable=False, index=True)

    major_name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    appearance_index: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    is_winner_in_comparison: Mapped[bool | None] = mapped_column(Boolean, nullable=True, default=None)

    round: Mapped["Round"] = relationship("Round", back_populates="appearances")
    session: Mapped["Session"] = relationship("Session")

    def __repr__(self):
        return (f"<ChoiceAppearance(uuid={self.uuid}, major_name='{self.major_name}', "
                f"round={self.round_id}, index={self.appearance_index}, status={self.is_winner_in_comparison != None})>")

class Round(Base):
    __tablename__ = "rounds"

    uuid: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id: Mapped[str] = mapped_column(String, ForeignKey("sessions.uuid", ondelete="CASCADE"), nullable=False, index=True)
    round_number: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    status: Mapped[RoundStatus] = mapped_column(SqlEnum(RoundStatus, name="round_status_enum"),
                                                default=RoundStatus.ACTIVE, nullable=False, index=True)
    current_round_majors: Mapped[dict] = mapped_column(JSON, nullable=False)

    session: Mapped["Session"] = relationship("Session", back_populates="rounds")
    appearances: Mapped[List["ChoiceAppearance"]] = relationship(
        "ChoiceAppearance",
        back_populates="round",
        cascade="all, delete-orphan",
        order_by="ChoiceAppearance.appearance_index"
    )

    def __repr__(self):
        return f"<Round(uuid={self.uuid}, round_number={self.round_number}, status={self.status})>"

class Session(Base):
    __tablename__ = "sessions"

    uuid: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, index=True, nullable=False)
    base_information: Mapped[dict] = mapped_column(JSON, nullable=False)
    status: Mapped[SessionStatus] = mapped_column(SqlEnum(SessionStatus, name="session_status_enum"),
                                                  default=SessionStatus.ONGOING, nullable=False, index=True)
    current_round_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    final_major_name: Mapped[str | None] = mapped_column(String, nullable=True, default=None)

    rounds: Mapped[List["Round"]] = relationship(
        "Round",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="Round.round_number"
    )

    def __repr__(self):
        return f"<Session(uuid={self.uuid}, user_id={self.user_id}, status={self.status})>"
