from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )

    DATABASE_URL: str
    DEBUG: bool = False
    ADMIN_PIN: str = "1234"
    SECRET_KEY: str = "restoque-secret-key-nicaragua-pos-2026"
    RESTIQUE_API_KEY: str | None = None
    API_KEY: str | None = None

    @property
    def api_key(self) -> str | None:
        return self.RESTIQUE_API_KEY or self.API_KEY


settings = Settings()
