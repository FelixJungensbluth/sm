from dataclasses import dataclass
from typing import List, Dict


@dataclass(frozen=True)
class Query:
    question: str
    terms: List[str]
    instructions: str


BASE_INFORMATION_QUERIES: Dict[str, Query] = {
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
}


EXCLUSION_CRITERIA_QUERIES: Dict[str, Query] = {
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
