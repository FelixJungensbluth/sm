from abc import ABC, abstractmethod
from typing import List

from app.config.settings import SettingsDep


class BaseLLM(ABC):
    """Abstract base class for LLM implementations (OpenAI, Ollama, etc.)"""

    def __init__(self, settings: SettingsDep, model_name: str):
        """
        Initialize the LLM with settings and model name.

        Args:
            settings: Application settings containing API keys and configuration
            model_name: Name of the model to use
        """
        self._settings = settings
        self._model_name = model_name

    @abstractmethod
    async def process_requests(
        self, requests: List[dict], max_attempts: int = 2
    ) -> List[dict]:
        """
        Process a list of requests asynchronously.

        Args:
            requests: List of request dictionaries to process
            max_attempts: Maximum number of retry attempts for failed requests

        Returns:
            List of response dictionaries. Each dictionary should contain either:
            - "response": The successful response data
            - "error": Error information if the request failed
        """
        pass

