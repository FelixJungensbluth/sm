from app.models.document import ProcessedDocument
import uuid
from app.llm.provider.base_llm import BaseLLM, LlmRequest
from attr import dataclass
from typing import List
from uuid import uuid4

from langchain_core.messages import AIMessage
from langchain_core.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field

from app.config.settings import SettingsDep
from app.config.logger import logger
from app.models.requirement import Requirement, RequirementType
from app.services.rag.splitter.recursiv_splitter import RecursiveSplitter


@dataclass(frozen=True)
class RequirementExtractionOutput(BaseModel):
    title: str = Field(description="Kurzer, prägnanter Titel der Anforderung")
    source: str = Field(description="Exakter Wortlaut aus dem Dokument ohne Kürzung")
    category: str = Field(description="Ausschluss oder Bewertung")
    type: RequirementType = Field(
        description="Business, Zu erarbeiten, Referenzprojekt, Nachweis Zertifikat, Nachweis Personal oder sonstiges"
    )


class RequirementExtractionList(BaseModel):
    requirements: List[RequirementExtractionOutput]


PROMPT = """
### Rolle des Modells
Du bist **Experte für die Analyse von Ausschreibungsdokumenten** und hilfst zu entscheiden,
ob sich eine Teilnahme lohnt.

### Aufgabe
Extrahiere **ausschließlich** Anforderungen, die den Zuschlag beeinflussen (siehe Liste unten).

### Extraktions-Regeln
## Relevant-Liste (positiv Beispiele - keine abschließende Liste)
• minimaler Unternehmens-Umsatz, setze "Business" als Type
• Mindestanzahl Mitarbeitende, setze "Business" als Type
• Abrechnungs- oder Preisangaben, setze "Business" als Type
• auszuarbeitende **Konzepte / Vorgehensmodelle**, setze "Zu erarbeiten" als Type
• nachzuweisende **Projekt-Referenzen**, setze "Referenzprojekt" als Type
• nachzuweisende **Zertifikate** (ISO, ITIL, …)  , setze "Nachweis Zertifikat" als Type
• nachzuweisende Skills / Erfahrungen der Mitarbeitenden, setze "Nachweis Personal" als Type
• nachzuweisende Erfahrungen mit bestimmten **Technologien**, setze "Sonstiges" als Type

## Nicht relevant (negativ Beispiele, diese ignorieren- keine abschließende Liste)
• Vertragsstrafen, SLA-Pönalen
• Allgemeine Vertrags-/AGB-Klauseln
• Allgemeine Rechte und Pflichten
• Definitionen
• Kündigungsrecht des Auftraggebers
• Gründe im Zusammenhang mit einer strafrechtlichen Verurteilung
• Arbeitsmethodik („agil“ o. Ä.)
• Nachweise über Russlandsanktionen
• Nachweise über Einträge im Handeslregister
• Nachweise über Haftpflichtversicherung inkl der Höhe der geforderten Versicherungssumme

## Weiter Regeln
1. **Nur** Anforderungen an **Softwareentwickler / Auftragnehmer** erfassen.
2. **Keine** Überschriften oder allgemeinen Einleitungen als Quelle verwenden.
3. Jede Anforderung = **ein** Eintrag.
4. Enthält der Satz „oder“-Verknüpfungen ⇒ Eintrag je Alternative.
5. **Quelle** (Originalwortlaut) **niemals kürzen**.
6. **Kein Halluzinieren** - nur Text, der *tatsächlich* im Dokument steht.
7. Der genau Wortlaut sowie die Formatierung muss für die Quelle übernommen werden

## Kategorien:
- Ausschluss: Muss-Kriterien (K.O.-Kriterien), "müssen", "zwingend erforderlich"
- Bewertung: Bewertungskriterien, "sollen", "wünschenswert"


### BEISPIELE:

Input: "Erfahrung mit [Frontend-Beispiel-Framework-1] oder [Frontend-Beispiel-Framework-2] erforderlich"
Output:
- Requirement 1: title="[Frontend-Beispiel-Framework-1]-Erfahrung", source="Erfahrung mit [Frontend-Beispiel-Framework-1] oder [Frontend-Beispiel-Framework-2] erforderlich"
- Requirement 2: title="[Frontend-Beispiel-Framework-2]-Erfahrung", source="Erfahrung mit [Frontend-Beispiel-Framework-1] oder [Frontend-Beispiel-Framework-2] erforderlich"

Input: "Mindestens 3 Jahre Backend-Entwicklung mit [Backend-Beispiel-Framework] zwingend erforderlich"
Output: title="3 Jahre [Backend-Beispiel-Framework] Backend-Entwicklung", category="Ausschluss"


### DOKUMENTENABSCHNITT:
{text}

### Output-Schema (immer genau so zurückgeben)
{format_instructions}

### Erinnerung
Nach der Extraktion, überprüfe nochmal, ob die gefundenen Anforderungen den Zuschlag beeinflussen und für den Nutzer,
anhand der oben beschriebenen Regeln relevant sind.
Fasse Requirements zusammen, wenn du es für Sinnvoll hälst, einzureichende Referenzen solltest du aber einzeln zu halten.
"""


class RequirementExtractionService:
    def __init__(self, settings: SettingsDep, llm_provider: BaseLLM):
        self._settings = settings
        self._parser = PydanticOutputParser(pydantic_object=RequirementExtractionList)
        self._splitter = RecursiveSplitter(
            chunk_size=2000, chunk_overlap=200, separators=None
        )
        self.llm_provider = llm_provider

    async def extract_requirements(
        self,
        tender_id,
        processed_documents: List[ProcessedDocument],
    ) -> list[Requirement]:

        llm_requests: List[LlmRequest] = []
        file_document_mapping = []
        for processed_document in processed_documents:
            documents = self._splitter.split_documents([processed_document])
            for doc in documents:
                prompt = PROMPT.replace("{text}", doc.page_content).replace(
                    "{format_instructions}", self._parser.get_format_instructions()
                )
                llm_requests.append(LlmRequest(role="assistant", message=prompt))
                file_document_mapping.append(processed_document.document.name)

        results = await self.llm_provider.process_requests(llm_requests)

        successful_responses = [r for r in results if "response" in r]
        extracted_requirements = []

        for resp in successful_responses:
            file_name = file_document_mapping[resp["task_id"]]
            reqs = self.parse_requirements(resp, tender_id, file_name, self._parser)
            extracted_requirements.extend(reqs)

        return extracted_requirements

    def parse_requirements(
        self,
        response: dict,
        tender_id: uuid.UUID,
        file_name: str,
        parser: PydanticOutputParser,
    ) -> List[Requirement]:
        requirements = []
        try:
            output = self.llm_provider.get_output(response, only_json=True)
            parsed_result = parser.invoke(AIMessage(content=output))
            for req in parsed_result.requirements:
                requirements.append(
                    Requirement(
                        id=uuid4(),
                        name=req.title,
                        source=req.source,
                        category=req.category,
                        type=req.type,
                        file=file_name,
                        tender_id=tender_id,
                    )
                )
        except Exception as e:
            logger.warning(f"Failed to parse requirements from response, skipping: {e}")

        return requirements
