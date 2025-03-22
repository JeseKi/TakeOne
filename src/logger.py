import os
from fastapi import UploadFile
from uuid import uuid4
from datetime import datetime 
import time
from enum import Enum

class LogLevel(Enum):
    INFO = 'INFO'
    DEBUG = 'DEBUG'
    WARNING = 'WARNING'
    ERROR = 'ERROR'
    
def event_time_log(event: str, level: LogLevel = LogLevel.DEBUG, isdatatime: bool = True):
    """
    记录事件和其发生的时间

    Args:
        event (str): 事件描述
        level (LogLevel): 日志级别 (LogLevel.INFO, LogLevel.DEBUG, LogLevel.WARNING, LogLevel.ERROR)
        isdatatime (bool): 是否记录系统时间，默认为 True
    """
    if not isinstance(level, LogLevel):
        raise ValueError("Invalid log level. Use LogLevel.INFO, LogLevel.DEBUG, LogLevel.WARNING, or LogLevel.ERROR.")

    log_level = level.value
    
    if isdatatime:
        now_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    else:
        now_time = time.time()

    log_entry = f"""
[{log_level}]
{event}
[TIME] {now_time}
"""

    with open('logs.log', 'a', encoding='utf-8') as f:
        f.write(log_entry)