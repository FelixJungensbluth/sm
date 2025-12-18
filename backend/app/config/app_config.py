from app.embedding.provider.ollama import OllamaEmbedding
from app.embedding.provider.sentence_transformer import SentenceTransformerEmbedding
from app.embedding.provider.base_embedding import BaseEmbedding
import yaml
from pathlib import Path
from typing import Optional
from functools import lru_cache

from app.config.settings import SettingsDep
from app.llm.provider.base_llm import BaseLLM
from app.llm.provider.ollama import Ollama
from app.llm.provider.openai import OpenAi


@lru_cache
def _load_config() -> dict:
    config_path = Path(__file__).parent / "config.yaml"
    with open(config_path) as f:
        return yaml.safe_load(f)


def get_llm_provider(
    settings: SettingsDep,
) -> BaseLLM:
    config = _load_config()
    llm_config = config.get("llm", {})
    
    provider = llm_config.get("provider")
    model = llm_config.get("default_model")
    
    if not provider:
        raise ValueError("LLM provider not specified in config or parameter")
    if not model:
        raise ValueError("LLM model not specified in config or parameter")
    
    provider_config = llm_config.get("providers", {}).get(provider, {})
    
    api_url = provider_config.get("api_url")
    model_configs = provider_config.get("models")
    
    provider_lower = provider.lower()
    match provider_lower:
        case "ollama":
            return Ollama(
                settings=settings,
                model_name=model,
                api_url=api_url,
                model_configs=model_configs,
            )
        case "openai":
            return OpenAi(
                settings=settings,
                model_name=model,
                api_url=api_url,
                model_configs=model_configs,
            )
        case _:
            raise ValueError(f"Unknown LLM provider '{provider}'")      



def get_embedding_provider(
    settings: SettingsDep,
) -> BaseEmbedding:
    config = _load_config()
    embedding_config = config.get("embedding", {})
    provider = embedding_config.get("provider")
    model = embedding_config.get("default_model")
    
    if not provider:
        raise ValueError("Embedding provider not specified in config or parameter")
    if not model:
        raise ValueError("Embedding model not specified in config or parameter")

    provider_lower = provider.lower()
    match provider_lower:
        case "sentence_transformer":
            return SentenceTransformerEmbedding(
                settings=settings,
                model_name=model,
            )
        case "ollama":
            return OllamaEmbedding(
                settings=settings,
                model_name=model,
            )
        case _:
            raise ValueError(f"Unknown embedding provider '{provider}'")