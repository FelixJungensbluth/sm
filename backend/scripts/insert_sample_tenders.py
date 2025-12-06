#!/usr/bin/env python3
"""Script to insert 10 sample tenders into MongoDB."""

import sys
from pathlib import Path
from datetime import datetime, timezone, timedelta
import uuid
import random

# Add the backend directory to the path so we can import app modules
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.database.mongo import get_mongo_client, close_mongo_client
from app.repos.tender_repo import TenderRepo
from app.models.tender import Tender, TenderReviewStatus, TenderProcessingStatus
from app.models.base_information import BaseInformation, BaseInformationStatus
from app.models.job import TenderJob, StepStatus


def generate_sample_base_information() -> list[BaseInformation]:
    """Generate sample base information for a tender."""
    base_info_fields = [
        ("name", "Ausschreibung für IT-Dienstleistungen"),
        ("type", "Öffentliche Ausschreibung"),
        ("submission_deadline", "2024-12-31"),
        ("questions_deadline", "2024-12-15"),
        ("binding_period", "30 Tage"),
        ("implementation_period", "12 Monate"),
        ("contract_duration", "24 Monate"),
        ("client", "Bundesministerium für Digitales"),
        ("client_office_location", "Berlin, Deutschland"),
        ("russia_sanctions", "Ja, Sanktionen müssen beachtet werden"),
        ("reliability_123_124", "Erforderlich"),
        ("certificates", "ISO 27001, ISO 9001"),
        ("employee_certificates", "ITIL, PMP"),
        ("reference_projects", "Mindestens 3 ähnliche Projekte"),
        ("min_revenue_last_3_years", "500.000 EUR"),
        ("min_employees_last_3_years", "10 Mitarbeiter"),
        ("compact_description", "Entwicklung und Wartung von IT-Systemen"),
        ("contract_volume", "1.500.000 EUR"),
        ("liability_insurance", "Mindestens 5 Mio. EUR"),
    ]
    
    # Randomly select 5-10 fields to include
    selected_fields = random.sample(base_info_fields, random.randint(5, len(base_info_fields)))
    
    base_information = []
    for field_name, value in selected_fields:
        # Randomly assign status
        status = random.choice(list(BaseInformationStatus))
        
        base_info = BaseInformation(
            value=value,
            source_file=f"ausschreibung_{random.randint(1, 5)}.pdf",
            source_file_id=str(uuid.uuid4()),
            exact_text=f"Im Dokument steht: {value}",
            field_name=field_name,
            status=status,
            note=f"Notiz zu {field_name}" if random.random() > 0.5 else None,
            fulfillable=random.choice([True, False, None]) if random.random() > 0.3 else None,
        )
        base_information.append(base_info)
    
    return base_information


def generate_sample_tenders() -> list[Tender]:
    """Generate 10 sample tenders."""
    tender_titles = [
        "IT-Dienstleistungen für Bundesbehörde",
        "Cloud-Migrationsprojekt öffentliche Verwaltung",
        "Entwicklung von E-Government-Plattform",
        "Cybersecurity-Beratung für Ministerium",
        "Datenbankmodernisierung öffentlicher Sektor",
        "Software-Entwicklung für Gesundheitswesen",
        "IT-Infrastruktur für Bildungseinrichtung",
        "Digitalisierungsprojekt Kommunalverwaltung",
        "KI-Lösungen für öffentliche Verwaltung",
        "IT-Support und Wartung für Behörde",
    ]
    
    tender_descriptions = [
        "Umfassende IT-Dienstleistungen für die Digitalisierung der Bundesbehörde. "
        "Einschließlich Entwicklung, Wartung und Support von IT-Systemen.",
        "Migration bestehender IT-Systeme in die Cloud. "
        "Umfassende Beratung und Implementierung erforderlich.",
        "Entwicklung einer modernen E-Government-Plattform für Bürgerdienste. "
        "Fokus auf Benutzerfreundlichkeit und Sicherheit.",
        "Cybersecurity-Beratung und Implementierung von Sicherheitsmaßnahmen. "
        "Erfahrung mit öffentlichen Sektor erforderlich.",
        "Modernisierung veralteter Datenbanksysteme. "
        "Migration zu modernen, skalierbaren Lösungen.",
        "Entwicklung von Softwarelösungen für das Gesundheitswesen. "
        "Einhaltung von Datenschutzbestimmungen erforderlich.",
        "Aufbau und Wartung von IT-Infrastruktur für Bildungseinrichtung. "
        "Unterstützung von Remote-Learning-Lösungen.",
        "Digitalisierungsprojekt für Kommunalverwaltung. "
        "Automatisierung von Verwaltungsprozessen.",
        "Entwicklung und Implementierung von KI-Lösungen. "
        "Fokus auf Effizienzsteigerung in Verwaltungsprozessen.",
        "IT-Support und Wartung für Behörde. "
        "7x24 Support und schnelle Reaktionszeiten erforderlich.",
    ]
    
    statuses = list(TenderReviewStatus)
    
    tenders = []
    base_time = datetime.now(timezone.utc)
    
    for i, (title, description) in enumerate(zip(tender_titles, tender_descriptions)):
        # Vary creation times slightly
        created_at = base_time - timedelta(days=random.randint(0, 30))
        updated_at = created_at + timedelta(days=random.randint(0, 10))
        
        tender = Tender(
            id=uuid.uuid4(),
            title=title,
            generated_title=f"Generierter Titel: {title}",
            description=description,
            base_information=generate_sample_base_information(),
            status=random.choice(statuses),
            created_at=created_at,
            updated_at=updated_at,
        )
        tenders.append(tender)
    
    return tenders


def create_completed_job(client, tender_id: uuid.UUID, created_at: datetime) -> bool:
    """Create a completed job for a tender so it appears in the frontend."""
    try:
        db = client["skillMatch"]
        tender_jobs = db["tender_jobs"]
        
        pipeline = ["index_documents", "extract_base_information", "extract_requirements"]
        job = TenderJob(
            type="tender_processing",
            tender_id=str(tender_id),
            document_ids=[],  # Empty for sample data
            pipeline=pipeline,
            current_step_index=len(pipeline) - 1,  # Last step since it's done
            status=TenderProcessingStatus.done,
            step_status=[
                StepStatus(name="index_documents", status="done", last_error=None),
                StepStatus(name="extract_base_information", status="done", last_error=None),
                StepStatus(name="extract_requirements", status="done", last_error=None),
            ],
            attempts=1,
            max_attempts=5,
            locked_by=None,
            locked_at=None,
            created_at=created_at,
            updated_at=created_at,
        )
        
        doc = job.model_dump(by_alias=True, exclude_none=True, mode='json')
        # Convert datetime strings back to datetime objects for MongoDB
        if isinstance(doc.get("created_at"), str):
            doc["created_at"] = datetime.fromisoformat(doc["created_at"].replace("Z", "+00:00"))
        if isinstance(doc.get("updated_at"), str):
            doc["updated_at"] = datetime.fromisoformat(doc["updated_at"].replace("Z", "+00:00"))
        tender_jobs.insert_one(doc)
        return True
    except Exception as e:
        print(f"    ✗ Error creating job: {e}")
        return False


def main():
    """Main function to insert sample tenders."""
    print("Connecting to MongoDB...")
    try:
        client = get_mongo_client()
        print("✓ Connected to MongoDB")
    except Exception as e:
        print(f"✗ Failed to connect to MongoDB: {e}")
        return 1
    
    try:
        repo = TenderRepo(client)
        print("✓ Initialized TenderRepo")
        
        print("\nGenerating 10 sample tenders...")
        tenders = generate_sample_tenders()
        print(f"✓ Generated {len(tenders)} tenders")
        
        print("\nInserting tenders into MongoDB...")
        inserted_count = 0
        job_count = 0
        for i, tender in enumerate(tenders, 1):
            try:
                result = repo.create_tender(tender)
                if result:
                    print(f"  [{i}/10] ✓ Inserted tender: {tender.title}")
                    inserted_count += 1
                    
                    # Create a completed job for this tender
                    if create_completed_job(client, tender.id, tender.created_at):
                        job_count += 1
                        print(f"       ✓ Created completed job for tender")
                    else:
                        print(f"       ✗ Failed to create job for tender")
                else:
                    print(f"  [{i}/10] ✗ Failed to insert tender: {tender.title}")
            except Exception as e:
                print(f"  [{i}/10] ✗ Error inserting tender '{tender.title}': {e}")
        
        print(f"\n✓ Successfully inserted {inserted_count} out of {len(tenders)} tenders")
        print(f"✓ Created {job_count} completed jobs")
        print("\nNote: Tenders will now appear in the frontend because they have completed jobs.")
        return 0 if inserted_count == len(tenders) else 1
        
    except Exception as e:
        print(f"✗ Error: {e}")
        return 1
    finally:
        close_mongo_client()
        print("\n✓ Closed MongoDB connection")


if __name__ == "__main__":
    exit(main())

