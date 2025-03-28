import json
import re
from pydantic import BaseModel

from loguru import logger
from openai import AsyncOpenAI

from config import BASE_URL, API_KEY, MODEL

class MajorsReveal(BaseModel):
    major_1_description: str
    major_2_description: str

async_client = AsyncOpenAI(api_key=API_KEY, base_url=BASE_URL)

prompt = """你需要面向正在进行志愿填报的高中生，向他们**一针见血**的揭示一个专业背后的**正常收益**和对应的**严重代价**。

以下是这个高中生的部分信息：
{infos}

要求：
1. 正常收益需要是一个普通人通过**大量努力**可以获取到的：
- 不是「设计获奖」而是「中建录用」
- 不是「报道轰动」而是「报社转正」
- 不是「投资神话」而是「银行柜员」
2. 严重代价是一个普通人**严重但是符合预期的代价**。颗粒度要小：
用可量化的生存细节替代抽象概念，且符合高中生的认知：
- 「颈椎变形+视力骤降300度」替代「健康代价」
- 「1000份命题作文」替代「工作重复性」
- 「喝水超时扣绩效」替代「职场压迫」
3. 假设这个高中生在大学四年中，在特性上没有任何改变。
4. 输出格式参考few_shot中的，我们会给出两个专业，同样也只以json格式最终输出两个专业的。

few_shots（仅供参考，**请勿直接挪用例句中的代价或收益**）：
```
{{
    "计算机类": "当获得大厂实习月薪8000时，能否接受体检报告显示颈椎变形+视力骤降300度？",
    "土木工程": "当手握中建X局录用通知时，能否接受未来三年睡工棚、全年无休的生存模式？",
    "师范专业": "当通过教师编考试时，能否接受月薪3800且被家长凌晨三点打电话骂不会教？",
    "临床医学": "当拿到执业医师资格证时，能否接受值夜班48小时后被患者投诉「态度冷漠」？",
    "法学专业": "当终于通过司法考试时，能否接受在律所每天复印案卷到凌晨的「实习期生存法则」？",
    "新闻传播": "当得到报社转正机会时，能否接受领导要求你编造「外卖员日入过万」的正能量报道？",
    "金融学": "当收到银行柜员岗Offer时，能否接受监控下喝水超时1分钟就扣绩效的「数字化管理」？",
    "生物技术": "当进入知名药企质检部时，能否接受每天重复12小时显微镜观测菌落的机械劳动？",
    "环境工程": "当通过环保局事业单位考试时，能否接受每月16次凌晨突击检查排污口的「奉献精神」？",
    "汉语言文学": "当成为中学语文老师时，能否接受批改1000份「双减后我的快乐生活」命题作文？"
}}
```

以下是两个你要揭示的专业：
{major_a}, {major_b}

---

「平静的表象掩盖了极端事件的可能性，而我们却对此视而不见。」 ——纳西姆·尼古拉斯·塔勒布《黑天鹅》"""

async def gen_majors_reveal(infos: str, major_a: str, major_b: str) -> MajorsReveal:
    logger.debug(f"Generating majors reveal for {major_a} and {major_b}")
    try: 
        response = await async_client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "user", "content": prompt.format(infos=infos, major_a=major_a, major_b=major_b)}
            ],
            stream=False
        )
        logger.debug(f"Response: {response}")
        majors_reveal_dict:dict = await extract_majors_from_json_codeblock(response.choices[0].message.content)
        majors_reveal = MajorsReveal(major_1_description=majors_reveal_dict[major_a], major_2_description=majors_reveal_dict[major_b])
            
        return majors_reveal
    except Exception as e:
        logger.error(f"Error: {e}")
        raise e

async def extract_majors_from_json_codeblock(response: str) -> dict:
    match = re.search(r'```json\n(.*?)\n```', response, re.DOTALL)
    if not match:
        raise ValueError("No JSON code block found in the response.")
    
    json_content = match.group(1)
    
    try:
        data = json.loads(json_content)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON content: {e}")
    
    return data