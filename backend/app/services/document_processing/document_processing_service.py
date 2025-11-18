import uuid


from app.services.document_processing.markdown_converter import (
    convert_to_markdown,
)

from app.models.document import ProcessedDocument, Document
from app.services.external.minio_service import MinioService
from app.config.logger import logger


def process_documents(
    tender_id: uuid.UUID,
    minio_service: MinioService,
    documents: list[Document],
) -> list[ProcessedDocument]:
    tender_files = list(minio_service.get_tender_files(tender_id))
    logger.info(f"Starting document processing for {len(tender_files)} files")

    document_map = {doc.id: doc.name for doc in documents}
    processed_documents: list[ProcessedDocument] = []

    processed_documents, incomplete_documents = convert_to_markdown(
        tender_id, minio_service, document_map, True
    )

    # Second pass with OCR for incomplete files
    if incomplete_documents:
        logger.info(
            f"Starting second pass (with OCR) for {len(incomplete_documents)} incomplete documents"
        )
        ocr_processed_documents, _ = convert_to_markdown(
            tender_id, minio_service, document_map, False
        )
        processed_documents.extend(ocr_processed_documents)

    logger.info(f"Successfully processed {len(processed_documents)} documents total")
    return processed_documents
