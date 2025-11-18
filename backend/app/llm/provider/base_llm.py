from abc import ABC, abstractmethod
from typing import List

from attr import dataclass

from app.config.settings import SettingsDep


@dataclass(frozen=True)
class LlmRequest:
    role: str
    message: str

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
    
    @abstractmethod
    def create_request(self, requests: List[LlmRequest]) -> List[dict]:
        """
        Create a request for the LLM provider.

        Args:
            request: The request to create

        Returns:
            List of request dictionaries.
        """
        pass

    @abstractmethod
    def get_output(self, response: dict) -> str:
        """
        Get the output from the response.

        Args:
            response: The response from the LLM provider.

        Returns:
            The output from the response.
        """
        pass

