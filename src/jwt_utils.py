import asyncio
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from jwt import PyJWKClient
import requests

from config import CASDOOR_ENDPOINT, CASDOOR_CLIENT_ID, CASDOOR_TOKEN_ENDPOINT, CASDOOR_CLIENT_SECRET, \
    CASDOOR_ORGANIZATION_NAME, CASDOOR_APP_NAME

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=CASDOOR_TOKEN_ENDPOINT)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        response = await asyncio.to_thread(requests.get, f"{CASDOOR_ENDPOINT}/api/user", 
                                             headers={"Authorization": f"Bearer {token}"})
        
        response.raise_for_status()
        return response.json()
    except requests.exceptions.HTTPError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal Server Error",
        )

def requests_get_token(token_endpoint, token_params, headers):
    try:
        response = requests.post(token_endpoint, data=token_params, headers=headers)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.HTTPError as e:
        raise e
    except Exception as e:
        raise e