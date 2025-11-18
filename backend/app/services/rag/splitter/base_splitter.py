from abc import ABC, abstractmethod
from typing import List

from langchain_core.documents import Document

from app.models.document import ProcessedDocument


class BaseSplitter(ABC):
    @abstractmethod
    def split_documents(self, processed_files: List[ProcessedDocument]) -> List[Document]:
        pass
