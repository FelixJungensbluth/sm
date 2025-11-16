import uuid


from app.services.document_processing.markdown_converter import (
    convert_to_markdown,
)

from app.models.file import ProcessedFile
from app.services.external.minio_service import MinioService
from app.config.logger import logger


def process_documents(
    tender_id: uuid.UUID,
    minio_service: MinioService,
) -> list[ProcessedFile]:
    tender_files = list(minio_service.get_tender_files(tender_id))
    logger.info(f"Starting document processing for {len(tender_files)} files")

    processed_files: list[ProcessedFile] = []

    docling_processed_files, incomplete_files = convert_to_markdown(
        tender_id, minio_service, True
    )
    processed_files.extend(docling_processed_files)

    # Second pass with OCR for incomplete files
    if incomplete_files:
        logger.info(
            f"Starting second pass (with OCR) for {len(incomplete_files)} incomplete files"
        )
        ocr_processed_files, _ = convert_to_markdown(tender_id, minio_service, False)
        processed_files.extend(ocr_processed_files)

    logger.info(f"Successfully processed {len(processed_files)} files total")
    return processed_files
