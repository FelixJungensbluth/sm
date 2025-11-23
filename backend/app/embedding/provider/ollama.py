from typing import List
import ollama
from app.config.settings import SettingsDep
from app.embedding.provider.base_embedding import BaseEmbedding


class OllamaEmbedding(BaseEmbedding):
    def __init__(self, settings: SettingsDep, model_name: str):
        super().__init__(settings, model_name)

    async def embed_query(self, query: str) -> List[float]:
        response = ollama.embed(model=self._model_name, input=query)
        embeddings = response.embeddings
        
        return list(embeddings[0])