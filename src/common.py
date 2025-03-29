import asyncio
from functools import wraps
from fastapi import HTTPException
from typing import Callable, Type, Tuple, Optional

def timeout(seconds: float = 10):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                return await asyncio.wait_for(func(*args, **kwargs), timeout=seconds)
            except asyncio.TimeoutError:
                raise HTTPException(
                    status_code=504,
                    detail=f"操作超时，请在 {seconds} 秒内完成"
                )
        return wrapper
    return decorator

def retry(
    exceptions: Tuple[Type[Exception], ...] = (Exception,),
    max_retries: int = 3,
    delay: float = 1.0,
    backoff: float = 2.0,
    logger: Optional[Callable] = None
):
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            current_delay = delay
            for attempt in range(max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    if attempt == max_retries:
                        raise
                    if logger:
                        logger(f"Retrying {func.__name__} after {current_delay} seconds (attempt {attempt + 1}/{max_retries}) due to: {str(e)}")
                    await asyncio.sleep(current_delay)
                    current_delay *= backoff
        return async_wrapper
    return decorator