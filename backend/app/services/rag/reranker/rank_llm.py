import os
from typing import List

from langchain_community.document_compressors.rankllm_rerank import RankLLMRerank
from langchain_core.documents import Document

from app.services.rag.reranker.base_reranker import BaseReranker


class RankLlm(BaseReranker):
    def __init__(self, top_n: int, settings):
        os.environ["OPENAI_API_KEY"] = settings.OPENAI_API_KEY
        self.compressor = RankLLMRerank(
            top_n=top_n, model="gpt", gpt_model="gpt-4o-mini"
        )

    def rerank_documents(self, query: str, docs: List[Document]) -> List[Document]:
        return list(self.compressor.compress_documents(docs, query=query))
