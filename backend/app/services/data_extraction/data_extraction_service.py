from typing import Tuple
from dataclasses import dataclass
import re
import json
from typing import Dict, List
import uuid
import asyncio

from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.prompts import PromptTemplate

from app.config.settings import SettingsDep
from app.config.logger import logger
from app.models.extracted_data import ExtractedData
from app.services.rag.rag_service import RagService
from app.llm.provider.base_llm import BaseLLM, LlmRequest
from app.services.data_extraction.queries import Query


@dataclass
class DataExtractionRequest:
    field_name: str
    query: Query
    context: str
    request: LlmRequest
    error_context: str = ""


EXTRACT_PROMPT_TEMPLATE = """
Du bist Experte für die Analyse von deutschen Ausschreibungsunterlagen.

WICHTIGE REGELN:
1. Beantworte **ausschließlich** auf Basis des bereitgestellten Kontexts.
2. Antworte IMMER auf deutsch.
3. Wenn die Information fehlt, lasse sie lehr.
4. Gib exakt dieses JSON zurück (keine zusätzlichen Felder, keine Kommentare)
5. **KRITISCH**: Das "exact_text" Feld MUSS eine exakte, unveränderte Kopie aus dem Kontext sein
6. **NIEMALS** den exact_text umformulieren, zusammenfassen oder ändern
7. **NIEMALS** mehrere Textpassagen in exact_text kombinieren
8. Wenn der Text über mehrere Zeilen geht, kopiere ihn exakt mit allen Zeilenumbrüchen
9. Kopiere den Text inklusive aller Sonderzeichen, Zahlen und Formatierung
10. Gib IMMER die Datei-ID (source_file_id) an wenn es eine Quelle gibt
11. Gib IMMER den Dateinamen (source_file) an wenn es eine Quelle gibt

**BEISPIEL für exact_text:**
- RICHTIG: "Mindestumsatz von 2.500.000 EUR in den letzten drei Geschäftsjahren"
- FALSCH: "Der Bewerber muss einen Mindestumsatz von 2,5 Mio Euro vorweisen"

**Spezielle Anweisung für dieses Feld:**
{field_instructions}

{format_instructions}

<|user|>
Gesuchtes Feld: **{field_name}**
Spezifische Frage: **{field_question}**
---
Kontext:
{context}

{error_context}
<|assistant|>
""".strip()

INITIAL_CONTEXT_SIZE = 15


def find_source_in_context(query: str, document: str) -> bool:
    cleaned_document = re.sub(r"[^A-Za-z0-9]", "", document)
    cleaned_query = re.sub(r"[^A-Za-z0-9]", "", query)

    return cleaned_query in cleaned_document


class DataExtractionService:
    def __init__(
        self, settings: SettingsDep, llm_provider: BaseLLM, rag_service: RagService
    ):
        self.settings = settings
        self.parser = PydanticOutputParser(pydantic_object=ExtractedData)
        self.llm_provider = llm_provider
        self.rag_service = rag_service

        self.prompt_template = PromptTemplate(
            template=EXTRACT_PROMPT_TEMPLATE,
            input_variables=[
                "field_name",
                "field_question",
                "field_instructions",
                "context",
                "error_context",
            ],
            partial_variables={
                "format_instructions": self.parser.get_format_instructions()
            },
        )

    async def get_context(
        self,
        tender_id: uuid.UUID,
        query: str,
        search_terms: List[str] | None = None,
        top_k: int = 15,
    ) -> str:
        if search_terms:
            combined_keywords = " ".join(search_terms)
            query = f"{query} Relevante Keywords: {combined_keywords}"

        chunks = await self.rag_service.retrieve_chunks(tender_id, query, top_k=top_k)

        context_parts = []
        for chunk in chunks:
            context_parts.append(
                f"Dateiname {chunk.file_name}, Datei-ID: {chunk.file_id}: \n{chunk.content}"
            )
        context = "\n\n".join(context_parts)

        return context

    async def create_requests(
        self,
        tender_id: uuid.UUID,
        queries: Dict[str, Query],
        top_k: int = INITIAL_CONTEXT_SIZE,
    ) -> List[DataExtractionRequest]:
        context_tasks = [
            self.get_context(tender_id, query.question, query.terms, top_k)
            for query in queries.values()
        ]
        contexts = await asyncio.gather(*context_tasks)

        data_extraction_requests = []
        for (field_name, query), context in zip(queries.items(), contexts):
            prompt = self.prompt_template.format(
                field_name=field_name,
                field_question=query.question,
                field_instructions=query.instructions,
                context=context,
                error_context="",
            )

            data_extraction_requests.append(
                DataExtractionRequest(
                    field_name=field_name,
                    query=query,
                    request=LlmRequest(role="system", message=prompt),
                    context=context,
                )
            )

        return data_extraction_requests

    async def extract_base_information(
        self, tender_id: uuid.UUID, queries: Dict[str, Query]
    ) -> Tuple[List[dict], List[DataExtractionRequest]]:
        data_extraction_requests = await self.create_requests(tender_id, queries)

        llm_requests = [req.request for req in data_extraction_requests]
        results = await self.llm_provider.process_requests(llm_requests)

        return results, data_extraction_requests
