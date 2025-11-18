from abc import ABC, abstractmethod
from typing import List
from langchain_core.documents import Document


class BaseReranker(ABC):
    @abstractmethod
    def rerank_documents(self, query: str, docs: List[Document]) -> List[Document]:
        pass
