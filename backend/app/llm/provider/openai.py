from typing import Dict, List, Optional, AsyncGenerator
import aiohttp
import json

from app.config.settings import SettingsDep
from app.llm.parallel_llm_processor import RequestProcessor
from app.llm.provider.base_llm import BaseLLM, LlmRequest
from app.llm.utils import extract_json_from_content
from app.config.logger import logger


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
        self, llm_requests: List[LlmRequest], max_attempts: int = 2
    ) -> List[dict]:
        requests = self.create_request(llm_requests)
        return await self._processor.process_requests(requests, max_attempts)

    def create_request(self, requests: List[LlmRequest]) -> List[dict]:
        return [
            {
                "model": self._model_name,
                "messages": [{"role": r.role, "content": r.message}],
            }
            for r in requests
        ]

    def get_output(self, response: dict, only_json: bool = False) -> str:
        # OpenAI API response structure: {"choices": [{"message": {"content": "..."}}]}
        content = response["response"]["choices"][0]["message"]["content"]
        
        if only_json:
            return extract_json_from_content(content)
        
        return content

    async def get_response(
        self, llm_requests: List[LlmRequest]
    ) -> str:
        """Get complete response from OpenAI API (non-streaming)."""
        messages = [{"role": r.role, "content": r.message} for r in llm_requests]
        
        request_data = {
            "model": self._model_name,
            "messages": messages,
            "stream": False,
        }

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self._settings.OPENAI_API_KEY}",
        }

        async with aiohttp.ClientSession() as session:
            try:
                async with session.post(
                    self._api_url,
                    json=request_data,
                    headers=headers,
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"OpenAI API error {response.status}: {error_text}")
                        raise Exception(f"OpenAI API error {response.status}: {error_text}")

                    data = await response.json()
                    choices = data.get("choices", [])
                    if not choices:
                        raise Exception("No choices in OpenAI response")
                    
                    content = choices[0].get("message", {}).get("content", "")
                    if not content:
                        raise Exception("No content in OpenAI response")
                    
                    return content
            except Exception as e:
                logger.error(f"Error getting response from OpenAI: {e}")
                raise