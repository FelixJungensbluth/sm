import yaml
from pathlib import Path
from typing import Annotated, Optional
from functools import lru_cache
from fastapi import Depends

from app.config.settings import get_settings, SettingsDep
from app.llm.provider.base_llm import BaseLLM
from app.llm.provider.ollama import Ollama
from app.llm.provider.openai import OpenAi


@lru_cache
def _load_config() -> dict:
    config_path = Path(__file__).parent / "config.yaml"
    with open(config_path) as f:
        return yaml.safe_load(f)


def init_llm_provider(
    settings: SettingsDep,
    provider_name: Optional[str] = None,
    model_name: Optional[str] = None,
) -> BaseLLM:
    config = _load_config()
    llm_config = config.get("llm", {})
    
    provider = provider_name or llm_config.get("provider")
    model = model_name or llm_config.get("default_model")
    
    if not provider:
        raise ValueError("LLM provider not specified in config or parameter")
    if not model:
        raise ValueError("LLM model not specified in config or parameter")
    
    provider_config = llm_config.get("providers", {}).get(provider, {})
    
    api_url = provider_config.get("api_url")
    model_configs = provider_config.get("models")
    
    provider_lower = provider.lower()
    if provider_lower == "ollama":
        return Ollama(
            settings=settings,
            model_name=model,
            api_url=api_url,
            model_configs=model_configs,
        )
    elif provider_lower == "openai":
        return OpenAi(
            settings=settings,
            model_name=model,
            api_url=api_url,
            model_configs=model_configs,
        )
    else:
        raise ValueError(
            f"Unknown LLM provider '{provider}'. "
            f"Available providers: ollama, openai"
        )


def get_llm_provider(settings: SettingsDep) -> BaseLLM:
    """FastAPI dependency to get LLM provider."""
    return init_llm_provider(settings=settings)
