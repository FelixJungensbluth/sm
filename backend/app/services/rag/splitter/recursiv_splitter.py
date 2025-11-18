from typing import List

import tiktoken
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

from app.config.logger import logger
from app.models.document import ProcessedDocument
from app.services.rag.splitter.base_splitter import BaseSplitter

MARKDOWN_SEPARATORS = [
    "\n## ",  # Main sections
    "\n### ",  # Sub-sections
    "\n#### ",  # Sub-sub-sections
    "\n##### ",  # Minor sections
    "\n###### ",  # Smallest sections
    "\n\n",  # Paragraph breaks
    "\n(?=\\d+\\.\\s)",  # Numbered lists (1. 2. 3.)
    "\n(?=\\w\\)\\s)",  # Lettered lists (a) b) c))
    "\n(?=[-•]\\s)",  # Bullet points
    "\\. ",  # Sentence breaks
    ", ",  # Comma breaks
    " ",  # Word breaks
    "",  # Character fallback
]


def toke_length_function(text: str) -> int:
    enc = tiktoken.get_encoding("cl100k_base")
    return len(enc.encode(text))


class RecursiveSplitter(BaseSplitter):
    def __init__(
        self,
        chunk_size: int = 1000,
        chunk_overlap: int = 100,
        separators=None,
    ):
        if separators is None:
            separators = MARKDOWN_SEPARATORS

        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            strip_whitespace=True,
            separators=separators,
            length_function=toke_length_function,
        )

    def split_documents(
        self, processed_files: List[ProcessedDocument]
    ) -> List[Document]:
        chunks: List[Document] = []
        for processed_file in processed_files:
            doc = Document(
                page_content=processed_file.content,
                metadata={
                    "file_id": str(processed_file.document.id),
                    "file_name": processed_file.document.name,
                },
            )
            chunks.extend(self.splitter.split_documents([doc]))

        logger.info(f"Created {len(chunks)} chunks")
        return chunks
