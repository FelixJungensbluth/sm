from typing import Dict, List, Optional, AsyncGenerator
import aiohttp
import json

from app.config.settings import SettingsDep
from app.llm.provider.base_llm import BaseLLM, LlmRequest
from app.llm.parallel_llm_processor import RequestProcessor
from app.llm.utils import extract_json_from_content
from app.config.logger import logger


# Default model configs - can be overridden in config.yaml
DEFAULT_OLLAMA_MODELS: Dict[str, Dict[str, float]] = {
    "llama3.2": {"rpm": 100.0, "tpm": 100000.0},
}

DEFAULT_API_URL = "http://localhost:11434/v1/chat/completions"
PROVIDER_NAME = "ollama"


class Ollama(BaseLLM):
    def __init__(
        self,
        settings: SettingsDep,
        model_name: str,
        api_url: Optional[str] = None,
        model_configs: Optional[Dict[str, Dict[str, float]]] = None,
        use_loop: bool = False,
        loop_port: int = 31300,
        ollama_host: str = "localhost",
        ollama_port: int = 11434,
    ):
        super().__init__(settings, model_name)

        self._model_configs = model_configs or DEFAULT_OLLAMA_MODELS
        
        # Build API URL based on configuration
        if api_url:
            # Explicit URL provided, use it
            self._api_url = api_url
        elif use_loop:
            # Use Lens Loop proxy
            self._api_url = f"http://localhost:{loop_port}/openai/http/{ollama_host}:{ollama_port}/v1/chat/completions"
            logger.info(f"Using Lens Loop proxy at {self._api_url}")
        else:
            # Direct connection to Ollama
            self._api_url = f"http://{ollama_host}:{ollama_port}/v1/chat/completions"
            logger.info(f"Connecting directly to Ollama at {self._api_url}")

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
        # OpenAI-compatible request format
        return [
            {
                "model": self._model_name,
                "messages": [{"role": r.role, "content": r.message}],
            }
            for r in requests
        ]

    def get_output(self, response: dict, only_json: bool = False) -> str:
        # OpenAI-compatible response structure: {"choices": [{"message": {"content": "..."}}]}
        content = response["response"]["choices"][0]["message"]["content"]
        
        if only_json:
            return extract_json_from_content(content)
        
        return content

    async def stream_response(
        self, llm_requests: List[LlmRequest]
    ) -> AsyncGenerator[str, None]:
        """Stream response from Ollama API."""
        messages = [{"role": r.role, "content": r.message} for r in llm_requests]
        
        request_data = {
            "model": self._model_name,
            "messages": messages,
            "stream": True,
        }

        async with aiohttp.ClientSession() as session:
            try:
                async with session.post(
                    self._api_url,
                    json=request_data,
                    headers={"Content-Type": "application/json"},
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"Ollama API error {response.status}: {error_text}")
                        yield f"[Error: {error_text}]"
                        return

                    async for line in response.content:
                        if not line:
                            continue
                        
                        try:
                            line_text = line.decode("utf-8").strip()
                            if not line_text or not line_text.startswith("data: "):
                                continue
                            
                            # Remove "data: " prefix (OpenAI SSE format)
                            data_str = line_text[6:]
                            
                            # Check for [DONE] marker
                            if data_str == "[DONE]":
                                break
                            
                            # Parse JSON
                            data = json.loads(data_str)
                            
                            # Extract content from choices (OpenAI format)
                            choices = data.get("choices", [])
                            if choices:
                                delta = choices[0].get("delta", {})
                                content = delta.get("content", "")
                                if content:
                                    yield content
                        except json.JSONDecodeError:
                            continue
                        except Exception as e:
                            logger.warning(f"Error parsing Ollama stream line: {e}")
                            continue
            except Exception as e:
                logger.error(f"Error streaming from Ollama: {e}")
                yield f"[Error: {str(e)}]"
