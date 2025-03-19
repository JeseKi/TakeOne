from fastapi import Depends, HTTPException, status, APIRouter
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from jwt import PyJWKClient

from config import CASDOOR_ENDPOINT, CASDOOR_CLIENT_ID, CASDOOR_TOKEN_ENDPOINT

jwt_router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=CASDOOR_TOKEN_ENDPOINT)

def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        jwks_url = f"{CASDOOR_ENDPOINT}/.well-known/jwks"
        jwks_client = PyJWKClient(jwks_url)
        signing_key = jwks_client.get_signing_key_from_jwt(token)

        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=CASDOOR_CLIENT_ID,
            issuer=CASDOOR_ENDPOINT,
        )

        return payload

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
