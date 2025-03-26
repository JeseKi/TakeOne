import json

config = json.load(open("config.json"))

BASE_URL = config["base_url"]
API_KEY = config["api_key"]
MODEL = config["model"]
SECRET_KEY = config["secret_key"]
CASDOOR_ENDPOINT = config["casdoor_endpoint"]
CASDOOR_CLIENT_ID = config["casdoor_client_id"]
CASDOOR_CLIENT_SECRET = config["casdoor_client_secret"]
CASDOOR_REDIRECT_URI = config["casdoor_redirect_uri"]
CASDOOR_TOKEN_ENDPOINT = config["casdoor_token_endpoint"]
CASDOOR_APP_NAME = config["casdoor_app_name"]
CASDOOR_ORGANIZATION_NAME = config["casdoor_organization_name"]