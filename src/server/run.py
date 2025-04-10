#!/usr/bin/env python
import uvicorn
import os
import sys
from loguru import logger
from dotenv import load_dotenv
from pathlib import Path

if __name__ == "__main__":
    logger.remove()
    load_dotenv(Path.cwd() / ".env")
    log_level = os.getenv('LOG_LEVEL', 'INFO').upper()
    
    logger.add(
        "logs/selfknowing.log", 
        rotation="10 MB", 
        level=log_level,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>"
    )
    
    logger.add(
        sys.stderr,
        level=log_level,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>"
    )
    
    os.makedirs("logs", exist_ok=True)
    
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=30129, 
        reload=True, 
        log_level=log_level.lower()
    )