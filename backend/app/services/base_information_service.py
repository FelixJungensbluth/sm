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
from app.models.base_information import BaseInformation
from app.services.rag.rag_service import RagService
from app.llm.provider.base_llm import BaseLLM, LlmRequest


@dataclass(frozen=True)
class Query:
    question: str
    terms: List[str]
    instructions: str


@dataclass
class BaseInformationRequest:
    field_name: str
    query: Query
    context: str
    request: LlmRequest
    error_context: str = ""


QUERIES: Dict[str, Query] = {
    "name": Query(
        question="Wie lautet der vollständige Name des ausgeschriebenen Projekts?",
        terms=[
            "Ausschreibungsname",
            "Bezeichnung der Ausschreibung",
            "Vergabegegenstand",
        ],
        instructions="Extrahiere den exakten, vollständigen Projektnamen. Achte auf offizielle Bezeichnungen und vermeide Abkürzungen. Der Name sollte eindeutig das Projekt identifizieren.",
    ),
    "type": Query(
        question="Handelt es sich um einen Teilnahmewettbewerb oder um eine Angebotsabgabe?",
        terms=[
            "Teilnahmewettbewerb",
            "Angebotsabgabe",
            "Ausschreibungsart",
            "Verfahrensart",
        ],
        instructions="Klassifiziere eindeutig als 'Teilnahmewettbewerb' oder 'Angebotsabgabe'",
    ),
    "submission_deadline": Query(
        question="Bis zu welchem Datum (Einreichungs- oder Schlusstermin) müssen Angebote abgegeben werden?",
        terms=[
            "Einreichungsfrist",
            "Schlusstermin",
            "Abgabefrist",
            "Submission",
            "Frist für die Einreichung",
            "Angebotseröffnung",
            "Submission",
        ],
        instructions="Finde das exakte Datum und die Uhrzeit für die Angebotsabgabe. Format: YYYY-MM-DDTHH:mm:ss.sssZ. Beispiel:14.07.2025 12:00 Uhr = 2025-07-14:12:00:00z",
    ),
    "questions_deadline": Query(
        question="Bis wann können Bieter Rückfragen stellen?",
        terms=["Bieterfragen", "Rückfragenfrist", "Frist für Fragen"],
        instructions="Suche nach dem letzten Termin für Bieterfragen. Berücksichtige sowohl schriftliche als auch mündliche Fragestellungen. Format: YYYY-MM-DDTHH:mm:ss.sssZ. Beispiel:14.07.2025 12:00 Uhr = 2025-07-14:12:00:00z",
    ),
    "binding_period": Query(
        question="Wie lange ist das Angebot bindend (Bindefrist)?",
        terms=["Bindefrist", "Bindefrist Angebot"],
        instructions="Format: YYYY-MM-DDTHH:mm:ss.sssZ. Beispiel:14.07.2025 12:00 Uhr = 2025-07-14:12:00:00z",
    ),
    "implementation_period": Query(
        question="Welcher Zeitraum ist für die Umsetzung/Ausführung vorgesehen?",
        terms=["Umsetzungsfrist", "Ausführungsfrist", "Leistungszeitraum"],
        instructions="Identifiziere den geplanten Zeitraum für die Projektdurchführung. Unterscheide zwischen Projektlaufzeit und Vertragslaufzeit. Gib Start- und Enddatum oder Dauer an.",
    ),
    "contract_duration": Query(
        question="Wie lange läuft der Vertrag insgesamt?",
        terms=["Laufzeit des Vertrages", "Vertragslaufzeit", "Gesamtlaufzeit"],
        instructions="",
    ),
    "client": Query(
        question="Wer ist der Auftraggeber bzw. die Vergabestelle der Ausschreibung?",
        terms=[
            "Auftraggeber",
            "im Folgenden AG",
            "Vergabestelle",
            "öffentliche Auftraggeber",
        ],
        instructions="Extrahiere den vollständigen Namen der auftraggebenden Organisation. Achte auf offizielle Bezeichnungen, Rechtsformen und eventuelle Abkürzungen.",
    ),
    "client_office_location": Query(
        question="Welcher Ort bzw. welche Adresse ist als Sitz des Auftraggebers genannt?",
        terms=[
            "Sitz des Auftraggebers",
            "Ort des Auftraggebers",
            "Adresse Auftraggeber",
        ],
        instructions="Finde die vollständige Adresse des Auftraggebers inklusive Straße, PLZ und Ort. Bei mehreren Standorten bevorzuge den Hauptsitz oder die Vergabestelle.",
    ),
    "russia_sanctions": Query(
        question="Wird eine Erklärung zu Russland-Sanktionen bzw. einem Wirtschaftsembargo gefordert?",
        terms=["Russlandsanktionen", "Embargo", "EU-Sanktionen Russland", "Erklärung"],
        instructions="",
    ),
    "reliability_123_124": Query(
        question="Wird Zuverlässigkeit gemäß § 123 oder § 124 GWB thematisiert (Ausschlussgründe)?",
        terms=["§123", "§124", "Zuverlässigkeit", "Ausschlussgründe", "Erklärung"],
        instructions="Prüfe auf Verweise zu den Paragraphen 123 oder 124 des GWB bezüglich Zuverlässigkeits- und Ausschlussgründen.",
    ),
    "certificates": Query(
        question="Gibt es bestimmte ISO (oder andere) Zertifikate?",
        terms=[
            "ISO 9001",
            "ISO 27001",
            "ISO 14001",
            "TISAX",
            "Zertifikat",
        ],
        instructions="Liste alle geforderten Zertifikate auf. Achte besonders auf ISO-Normen, branchenspezifische Zertifikate und deren genaue Bezeichnungen. Gib die vollständigen Zertifikatsnamen an.",
    ),
    "employee_certificates": Query(
        question=(
            "Werden bestimmte Zertifikate einzelner Mitarbeitender verlangt? Falls ja, welche Personenzertifikate werden genannt?"
        ),
        terms=[
            "Mitarbeiterzertifikat",
            "Personenzertifikat",
            "Zertifizierung der Mitarbeitenden",
            "AWS Certified",
            "Microsoft Certified",
            "ITIL",
            "PRINCE2",
            "Scrum Master",
            "PMI",
            "Cisco CCNA",
            "Fachzertifikat",
        ],
        instructions="Identifiziere alle Anforderungen an Mitarbeiterzertifikate. Unterscheide zwischen obligatorischen und wünschenswerten Qualifikationen. Gib die exakten Zertifikatsbezeichnungen und erforderliche Anzahl an.",
    ),
    "reference_projects": Query(
        question="Werden Referenzprojekte verlangt? Falls ja, mit welchen Mindestkriterien?",
        terms=["Referenzprojekte", "Referenzleistungen", "vergleichbare Projekte"],
        instructions="Extrahiere Anforderungen an Referenzprojekte inklusive Anzahl, Mindestvolumen, Zeitraum und fachliche Ähnlichkeit. Achte auf spezifische Kriterien wie Projektgröße oder Technologien.",
    ),
    "min_revenue_last_3_years": Query(
        question="Welcher Mindestumsatz der letzten drei Geschäftsjahre wird gefordert (in €)?",
        terms=[
            "Mindestumsatz",
            "Umsatz letzten 3 Jahre",
            "Jahresumsatz",
            "Gesamtumsatz",
            "in Höhe von",
            "mindestens",
            "EUR",
        ],
        instructions="Finde den geforderten Mindestumsatz und gib ihn in Euro an. Achte auf den Bezugszeitraum (meist 3 Jahre) und ob es sich um Gesamt- oder Jahresumsatz handelt. Format: Float Wert. "
        "Wenn es mehrere Lose/Teile/Abschnitte in der Ausschreibung mit unterschiedlichen Summen gibt, gib sie für alle Teile separat als Liste von Float Werten an",
    ),
    "min_employees_last_3_years": Query(
        question="Wie viele Mitarbeitende müssen in den letzten drei Geschäftsjahren beim Bewerber mindestens beschäftigt gewesen sein?",
        terms=[
            "Mitarbeiter",
            "Beschäftigte letzten Jahre",
            "Personalstärke",
            "Personalbestand",
            "Vollzeit",
        ],
        instructions="Ermittle die Mindestanzahl an Mitarbeitern. Unterscheide zwischen Vollzeit-, Teilzeit- und Gesamtmitarbeitern. Achte auf den Bezugszeitraum und ob Durchschnitts- oder Mindestanzahl gefordert ist. "
        "Wenn es mehrere Lose/Teile/Abschnitte in der Ausschreibung mit unterschiedlichen Anforderungen gibt, gib sie für alle Teile separat  (in einem Text) an.",
    ),
    "compact_description": Query(
        question="Worum geht es in der Ausschreibung?",
        terms=[
            "Leistungsbeschreibung",
            "Leistungsumfang",
            "Beratung",
            "Umsetzung",
            "Betrieb",
            "verwendete Technologien",
            "Technologieeinsatz",
        ],
        instructions="Fasse in einer ausführlich Beschreibung zusammen worum es in der Ausschreibung geht. Hier muss kein exact_wording oder source angegeben werden, da es sich um eine Zusammenfassung handelt. Schreibe zu den Überschriften Allgemeine Zusammenfassung/Abstract, Beratung, Umsetzung, Betrieb, Verwendete Technologien, Technologieeinsatz einen Abschnitt. Verwende Markdown Formatierung. Achte auf Leerzeilen zwischen Absätzen, damit gängige Renderer den Markdown-Text sauber anzeigen.",
    ),
    "contract_volume": Query(
        question="Wie hoch ist das Auftragsvolumen?",
        terms=[
            "Volumen",
            "Summe",
            "in höhe von",
            "Gesamtbetrag",
            "Kosten",
            "Budget",
            "Auftragswert",
            "Euro",
            "Personentage",
            "FTE",
        ],
        instructions="Finde das Auftragsvolumen und gib es in Euro in dem Format 'X.XXX.XXX €' an. Alternativ in Personentage und Laufzeit. "
        "Wenn es mehrere Lose/Teile/Abschnitte in der Ausschreibung mit unterschiedlichen Summen gibt, gib sie für alle Teile  (in einem Text) separat an.",
    ),
    "liability_insurance": Query(
        question="Wird eine Haftpflichtversicherung erwähnt?",
        terms=[
            "Versicherungssumme",
            "Deckungssumme",
            "Sachschäden",
            "Vermögensschäden",
            "Personenschäden",
            "Betriebshaftpflichtversicherung",
        ],
        instructions="Finde alle Versicherungssummen und gib sie zusammen mit den zu versichernden Typen in einer Liste an, sofern eine Haftpflichtversicherung erwähnt wird.",
    ),
}

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


class BaseInformationService:
    def __init__(
        self, settings: SettingsDep, llm_provider: BaseLLM, rag_service: RagService
    ):
        self.settings = settings
        self.parser = PydanticOutputParser(pydantic_object=BaseInformation)
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
        self, tender_id: uuid.UUID, top_k: int = INITIAL_CONTEXT_SIZE
    ) -> List[BaseInformationRequest]:
        context_tasks = [
            self.get_context(tender_id, query.question, query.terms, top_k)
            for query in QUERIES.values()
        ]
        contexts = await asyncio.gather(*context_tasks)

        base_information_requests = []
        for (field_name, query), context in zip(QUERIES.items(), contexts):
            prompt = self.prompt_template.format(
                field_name=field_name,
                field_question=query.question,
                field_instructions=query.instructions,
                context=context,
                error_context="",
            )

            base_information_requests.append(
                BaseInformationRequest(
                    field_name=field_name,
                    query=query,
                    request=LlmRequest(role="system", message=prompt),
                    context=context,
                )
            )

        return base_information_requests

    async def extract_base_information(
        self, tender_id: uuid.UUID
    ) -> Tuple[List[BaseInformation], str | None, str | None]:
        base_information_requests = await self.create_requests(tender_id)

        llm_requests = [req.request for req in base_information_requests]
        results = await self.llm_provider.process_requests(llm_requests)
        parsed_results, description, name = self.parse_results(results, base_information_requests, 0)

        if description and name:
            return list(parsed_results.values()) if parsed_results else [], description.value, name.value
        else:
            return list(parsed_results.values()) if parsed_results else [], None, None

    def parse_results(
        self,
        results: List[dict],
        base_information_requests: List[BaseInformationRequest],
        attempt: int,
    ):
        successful_results = {}
        description = None
        name = None

        for successful_response, req in zip(results, base_information_requests):
            field_name = req.field_name
            try:
                output = self.llm_provider.get_output(successful_response, only_json=True)
                
                # Fix cases where LLM returns dict for value instead of string
                try:
                    output_dict = json.loads(output)
                    if isinstance(output_dict.get("value"), dict):
                        # Convert dict value to JSON string
                        output_dict["value"] = json.dumps(output_dict["value"], ensure_ascii=False)
                        output = json.dumps(output_dict, ensure_ascii=False)
                except (json.JSONDecodeError, TypeError):
                    # If we can't parse/fix it, continue with original output
                    pass
                
                parsed_result: BaseInformation = self.parser.parse(output)

                field_name = parsed_result.field_name
                if field_name not in QUERIES:
                    logger.warning(f"Unexpected field name '{field_name}' in response")
                    continue

                base_information = BaseInformation(
                    value=parsed_result.value,
                    source_file=parsed_result.source_file,
                    source_file_id=parsed_result.source_file_id,
                    exact_text=parsed_result.exact_text,
                    field_name=parsed_result.field_name,
                )

                if base_information.value:
                    successful_results[field_name] = base_information

                    if field_name == "compact_description":
                        description = base_information
                    elif field_name == "name":
                        name = base_information
                        continue

                    if not parsed_result.exact_text:
                        logger.warning(f"Exact text is missing for {field_name}")
                        continue

                    if not parsed_result.source_file:
                        logger.warning(f"Source file not found for {field_name}")
                        continue

                    if not parsed_result.source_file_id:
                        logger.warning(f"Source file id not found for {field_name}")
                        continue

            except Exception as e:
                logger.error(f"Field '{field_name}' attempt {attempt} failed: {e}")

        return successful_results, description, name
