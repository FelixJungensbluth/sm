"""
Prompt templates for agentic data extraction.
"""


def build_system_prompt(field_instructions: str) -> str:
    """Build the system prompt for the agent."""
    return f"""Du bist ein Experte für die Analyse von deutschen Ausschreibungsunterlagen.

Du musst Informationen aus den bereitgestellten Dokumentenchunks extrahieren.

WICHTIGE REGELN:
1. Beantworte **ausschließlich** auf Basis des bereitgestellten Kontexts
2. Antworte IMMER auf deutsch
3. Wenn die Information fehlt, lasse sie leer (null)
4. Gib exakt dieses JSON zurück (keine zusätzlichen Felder, keine Kommentare)
5. **KRITISCH**: Das "exact_text" Feld MUSS eine exakte, unveränderte Kopie aus dem Kontext sein
6. **NIEMALS** den exact_text umformulieren, zusammenfassen oder ändern
7. **NIEMALS** mehrere Textpassagen in exact_text kombinieren
8. Wenn der Text über mehrere Zeilen geht, kopiere ihn exakt mit allen Zeilenumbrüchen
9. Kopiere den Text inklusive aller Sonderzeichen, Zahlen und Formatierung
10. Wenn du mehr Informationen benötigst, verwende die verfügbaren Tools

Verfügbare Tools:
- search_chunks(query, top_k): Suche nach relevanten Chunks mit einer Suchanfrage
- get_chunk_by_id(chunk_id): Hole einen spezifischen Chunk

**Spezielle Anweisung für dieses Feld:**
{field_instructions}

Antworte im JSON-Format:
{{
  "value": "Extrahierter Wert oder null",
  "exact_text": "Exakter Text aus dem Dokument (unverändert kopiert)",
  "confidence": "high|medium|low",
  "reasoning": "Begründung für die Extraktion"
}}"""


def build_user_prompt(
    field_name: str,
    question: str,
    terms: list[str],
    context: str,
) -> str:
    """Build the user prompt for a specific field extraction."""
    return f"""Gesuchtes Feld: **{field_name}**
Spezifische Frage: **{question}**

Relevante Suchbegriffe: {', '.join(terms)}

---

Kontext:
{context}

Verwende Tools wenn nötig, um mehr Informationen zu finden."""
