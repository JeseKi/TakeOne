
from typing import List
from pydantic import BaseModel

class BaseInformationRequest(BaseModel):
    max_living_expenses_from_parents: str  # 父母可供的大学生活费上限是多少？
    enough_savings_for_college: str  # 当前积蓄是否可能不贷款供完大学四年的生活费？
    pocket_money_usage: str  # 你平时的零花钱的用途是什么？
    willing_to_repeat_high_school_for_money: str  # 假如让你再读三年高三，每年都会给你的家庭免费的十万人民币，你愿意吗？
    city_tier: str  # 主要居住地区是几线城市？
    parents_in_public_sector: str  # 父母是否属于体制内？
    has_stable_hobby: str  # 是否有稳定的爱好？（需要每周起码有一半的天数会每天做的，且持续时间是一年以上）
    self_learning_after_gaokao: str  # 在高考完后的这段时间，是否有每天自主学习的习惯？
    proactive_in_competitions: str  # 是否主动参加过竞赛？（被推着上去推着走的不算）
    likes_reading_extracurricular_books: str  # 平时是否喜欢阅读课外书？

class Major(BaseModel):
    major: str
    description: str
    is_chosen: bool

class MajorChoice(BaseModel):
    major_a: Major
    major_b: Major

class MajorChoiceResult(BaseModel):
    major_name: str
    descriptions: List[str]
    chosen_sequence: List[int]

class SessionInfoResponse(BaseModel):
    base_information: BaseInformationRequest
    major_choices_result: List[MajorChoiceResult]
    
class CallbackRequest(BaseModel):
    code: str
    state: str
    
class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    id_token: str
    scope: str
    token_type: str
    expires_in: int

class UserInfo(BaseModel):
    id: str
    name: str
    email: str
    email_verified_at: str
    created_at: str
    updated_at: str