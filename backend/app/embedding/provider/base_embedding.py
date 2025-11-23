from abc import ABC, abstractmethod
from typing import List

from attr import dataclass

from app.config.settings import SettingsDep



class BaseEmbedding(ABC):
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
    async def embed_query(
        self, query: str
    ) -> List[float]:
        """
        Embed a query.

        Args:
            query: The query to embed

        Returns:
            The embedding of the query
        """
        pass
    


