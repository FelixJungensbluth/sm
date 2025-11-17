from typing import Dict, List, Optional

from app.config.settings import SettingsDep
from app.llm.parallel_llm_processor import RequestProcessor
from app.llm.provider.base_llm import BaseLLM


# Default model configs - can be overridden in config.yaml
DEFAULT_OPENAI_MODELS: Dict[str, Dict[str, float]] = {
    "gpt-4o": {"rpm": 5000.0, "tpm": 10000000.0},
    "gpt-4o-mini": {"rpm": 15000.0, "tpm": 10000000.0},
    "gpt-4-turbo": {"rpm": 5000.0, "tpm": 10000000.0},
    "gpt-4": {"rpm": 500.0, "tpm": 30000.0},
    "gpt-3.5-turbo": {"rpm": 10000.0, "tpm": 1000000.0},
}

DEFAULT_API_URL = "https://api.openai.com/v1/chat/completions"
PROVIDER_NAME = "openai"


class OpenAi(BaseLLM):
    def __init__(
        self,
        settings: SettingsDep,
        model_name: str,
        api_url: Optional[str] = None,
        model_configs: Optional[Dict[str, Dict[str, float]]] = None,
    ):
        super().__init__(settings, model_name)
        
        self._model_configs = model_configs or DEFAULT_OPENAI_MODELS
        self._api_url = api_url or DEFAULT_API_URL

        if model_name not in self._model_configs:
            raise ValueError("Unknown model")

        self.model_config = self._model_configs[model_name]

        self._processor = RequestProcessor(
            request_url=self._api_url,
            api_key=self._settings.OPENAI_API_KEY,
            max_requests_per_minute=self.model_config["rpm"],
            max_tokens_per_minute=self.model_config["tpm"],
        )

    async def process_requests(
        self, requests: List[dict], max_attempts: int = 2
    ) -> List[dict]:
        return await self._processor.process_requests(requests, max_attempts)
