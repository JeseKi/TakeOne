import json
import re
from pydantic import BaseModel
from typing import List

from loguru import logger
from openai import AsyncOpenAI

from config import BASE_URL, API_KEY, MODEL
from common import retry

class MajorsReveal(BaseModel):
    major_1_description: str
    major_2_description: str

class WisdomReport(BaseModel):
    final_three_majors: List[str]
    final_three_majors_report: List[str]
    final_recommendation: str

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

wisdom_report_prompt = """你是一位深邃的智者，如同黑客帝国中的先知，你能洞察人的命运和本质。现在你将为一位正在进行高考志愿填报的学生提供一份"智者的预言"风格的报告。

以下是该学生的基本信息：
{infos}

以下是该学生在专业选择过程中，最终保留下的三个专业（按照学生偏好排序，从最喜爱到最厌恶）：
{final_majors}

你的任务是创建一份智者预言报告，包含三个部分：

1. **命运的路标**：分析这三个专业如何反映了学生内心真正的追求和价值观。用哲理性的语言揭示每个专业的本质和它们反映的人生选择。每个专业的分析以"当你选择了[专业名]..."开头。

2. **镜像解析**：以一种先知式的语调，剖析每个专业背后隐藏的深层含义，以及它们将如何塑造学生的未来。揭示每个专业的真实挑战和潜在的成就。每个专业的解析应该深刻但不失实用性，要有具体的洞见。

3. **命运的抉择**：在三个专业中选出最符合该学生本质的一个，以预言的方式描述为什么这是最适合的选择，以及这条路径上的关键挑战和转折点，不要指明具体的时间点。这不仅是一个建议，更是一种深刻的洞察。

风格要求：
- 语言要有哲理性和预言性，但不要过于抽象难懂
- 你是一个看透事物本质的智者，语气要有一定的神秘感和权威性
- 在分析中融入对现实的洞察，但表达方式要有先知的风格
- 结尾加入一句富有哲理的箴言，作为对学生的最终指引

输出格式：必须是一个JSON格式，包含**三个键值对**：
1. "final_three_majors"：包含三个专业名称的数组
2. "final_three_majors_report"：包含三个专业分析的数组（每个元素是一段文字）
3. "final_recommendation"：最终推荐（一段文字）

示例输出：
```json
{{
  "final_three_majors": ["计算机科学", "心理学", "建筑学"],
  "final_three_majors_report": [
    "当你选择了计算机科学，你实际上是在选择一条探索无形世界的旅程...",
    "当你选择了心理学，你是在寻求理解人类心灵迷宫的钥匙...",
    "当你选择了建筑学，你渴望在物质世界中留下永恒的印记..."
  ],
  "final_recommendation": "在众多可能的未来中，计算机科学是与你灵魂共振的道路..."
}}
```

你的回答必须只包含JSON，不要有任何其他文字或解释。"""

@retry(logger=logger.error)
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
        majors_reveal_content = await extract_outer_code_block(response.choices[0].message.content)
        majors_reveal_dict:dict = json.loads(majors_reveal_content)
        majors_reveal = MajorsReveal(major_1_description=majors_reveal_dict[major_a], major_2_description=majors_reveal_dict[major_b])
            
        return majors_reveal
    except Exception as e:
        logger.error(f"Error: {e}")
        raise e

@retry(logger=logger.error)
async def gen_wisdom_report(infos: str, final_majors: List[str]) -> WisdomReport:
    """生成智者预言风格的报告，包含三个专业的深度分析和最终推荐。"""
    logger.debug(f"Generating wisdom report for final majors: {final_majors}")
    try:
        if len(final_majors) != 3:
            raise ValueError(f"Expected 3 final majors, but got {len(final_majors)}")
        
        majors_str = ", ".join([f"{i+1}. {major}" for i, major in enumerate(final_majors)])
        
        response = await async_client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "user", "content": wisdom_report_prompt.format(infos=infos, final_majors=majors_str)}
            ],
            stream=False
        )
        
        logger.debug(f"Response received for wisdom report: {response.choices[0].message.content}")
        report_content = await extract_outer_code_block(response.choices[0].message.content)
        logger.debug(f"Report content: {report_content}")
        
        report_json = json.loads(report_content)
        
        report = WisdomReport(
            final_three_majors=report_json["final_three_majors"],
            final_three_majors_report=report_json["final_three_majors_report"],
            final_recommendation=report_json["final_recommendation"]
        )
        
        return report
    except Exception as e:
        logger.error(f"Error generating wisdom report: {e}")
        raise e

async def extract_outer_code_block(text: str) -> str:
    start_pattern = re.compile(r'^```\s*\w*\b')
    end_pattern = re.compile(r'^\s*```\s*$')

    lines = text.split('\n')
    start_idx = None

    for idx, line in enumerate(lines):
        if start_pattern.match(line):
            start_idx = idx
            break

    if start_idx is None:
        return text
    end_idx = None
    for j in range(start_idx + 1, len(lines)):
        if end_pattern.match(lines[j]):
            end_idx = j
            break

    if end_idx is None:
        return text

    content_lines = lines[start_idx + 1 : end_idx]
    return '\n'.join(content_lines)