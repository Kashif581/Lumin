
from pydantic import BaseModel, ConfigDict


class SignupRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str = ""
    email: str = ""
    password: str = ""


class SigninRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    email: str = ""
    password: str = ""
