from typing import Dict, List, Optional

from app.config.settings import SettingsDep
from app.llm.provider.base_llm import BaseLLM, LlmRequest
from app.llm.parallel_llm_processor import RequestProcessor
from app.llm.utils import extract_json_from_content
from app.config.logger import logger


# Default model configs - can be overridden in config.yaml
DEFAULT_OLLAMA_MODELS: Dict[str, Dict[str, float]] = {
    "llama3.2": {"rpm": 100.0, "tpm": 100000.0},
}

DEFAULT_API_URL = "http://localhost:11434/api/chat"
PROVIDER_NAME = "ollama"


class Ollama(BaseLLM):
    def __init__(
        self,
        settings: SettingsDep,
        model_name: str,
        api_url: Optional[str] = None,
        model_configs: Optional[Dict[str, Dict[str, float]]] = None,
    ):
        super().__init__(settings, model_name)

        self._model_configs = model_configs or DEFAULT_OLLAMA_MODELS
        self._api_url = api_url or DEFAULT_API_URL

        if model_name not in self._model_configs:
            raise ValueError("Unknown model")

        self._processor = RequestProcessor(
            request_url=self._api_url,
            api_key="",
            max_requests_per_minute=self._model_configs[model_name]["rpm"],
            max_tokens_per_minute=self._model_configs[model_name]["tpm"],
        )

    async def process_requests(
        self, llm_requests: List[LlmRequest], max_attempts: int = 2
    ) -> List[dict]:
        requests = self.create_request(llm_requests)
        return await self._processor.process_requests(requests, max_attempts)

    def create_request(self, requests: List[LlmRequest]) -> List[dict]:
        return [
            {
                "model": self._model_name,
                "messages": [{"role": r.role, "content": r.message}],
                "stream": False,
                "think": False,
                "level": "medium"
            }
            for r in requests
        ]

    def get_output(self, response: dict, only_json: bool = False) -> str:
        content = response["response"]["message"]["content"]
        
        if only_json:
            return extract_json_from_content(content)
        
        return content
