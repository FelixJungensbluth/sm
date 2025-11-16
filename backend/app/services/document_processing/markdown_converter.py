import io
import re
from collections.abc import Iterable
import uuid

from PIL import Image

from app.services.document_processing.utils import (
    clean_content,
    is_content_sufficient,
)

Image.MAX_IMAGE_PIXELS = None
from docling.datamodel.base_models import ConversionStatus, InputFormat
from docling.datamodel.document import ConversionResult
from docling.datamodel.pipeline_options import (
    PdfPipelineOptions,
    TableFormerMode,
    TableStructureOptions,
)
from docling.datamodel.accelerator_options import AcceleratorOptions
from docling.document_converter import (
    DocumentConverter,
    PdfFormatOption,
    WordFormatOption,
    ExcelFormatOption,
)
from docling.pipeline.simple_pipeline import SimplePipeline
from docling.pipeline.standard_pdf_pipeline import StandardPdfPipeline
from docling_core.types.io import DocumentStream

from app.models.file import ProcessedFile
from app.services.external.minio_service import MinioService
from app.config.logger import logger


def export_documents(
    document_streams: list[DocumentStream],
    conv_results: Iterable[ConversionResult],
) -> tuple[list[ProcessedFile], list[str]]:
    processed_files: list[ProcessedFile] = []
    incomplete_files: list[str] = []

    success_count = 0
    failure_count = 0
    partial_success_count = 0

    for document_stream, conv_res in zip(document_streams, conv_results):
        name = document_stream.name
        logger.info(f"Converting {name}")
        if conv_res.status == ConversionStatus.SUCCESS:
            success_count += 1

            content = conv_res.document.export_to_markdown()
            content = clean_content(content)

            if not is_content_sufficient(content):
                incomplete_files.append(name)
                continue

            processed_files.append(ProcessedFile(name, content))

        elif conv_res.status == ConversionStatus.PARTIAL_SUCCESS:
            logger.info(
                f"Document {conv_res.input.file} was partially converted with the following errors:"
            )
            for item in conv_res.errors:
                logger.error(f"\t{item.error_message}")
            partial_success_count += 1
        else:
            logger.info(f"Document {conv_res.input.file} failed to convert.")
            failure_count += 1

    logger.info(
        f"Processed {success_count + partial_success_count + failure_count} docs, "
        f"of which {failure_count} failed "
        f"and {partial_success_count} were partially converted."
    )
    return processed_files, incomplete_files


def create_document_streams(
    tender_id: uuid.UUID, minio_service: MinioService
) -> list[DocumentStream]:
    document_streams: list[DocumentStream] = []

    for object_name, data in minio_service.get_tender_files(tender_id):
        file_data = io.BytesIO(data)
        document_streams.append(DocumentStream(name=object_name, stream=file_data))

    return document_streams


def convert_to_markdown(
    tender_id: uuid.UUID,
    minio_service: MinioService,
    use_ocr: bool = False,
) -> tuple[list[ProcessedFile], list[str]]:

    converter = get_converter(use_ocr)
    document_streams = create_document_streams(tender_id, minio_service)
    if not document_streams:
        logger.info("No valid documents to convert with Docling")
        return [], []

    try:
        conv_results = converter.convert_all(document_streams, raises_on_error=False)
        return export_documents(document_streams, conv_results)
    except Exception as e:
        logger.error(f"Error converting documents with Docling: {e}")
        return [], []


def get_converter(use_ocr: bool) -> DocumentConverter:
    return DocumentConverter(
        allowed_formats=[
            InputFormat.PDF,
            InputFormat.DOCX,
            InputFormat.XLSX,
            InputFormat.ASCIIDOC,
            InputFormat.CSV,
            InputFormat.PPTX,
            InputFormat.MD,
        ],
        format_options={
            InputFormat.PDF: PdfFormatOption(
                pipeline_cls=StandardPdfPipeline,
                pipeline_options=PdfPipelineOptions(
                    do_ocr=use_ocr,
                    do_table_structure=True,
                    table_structure_options=TableStructureOptions(
                        mode=TableFormerMode.ACCURATE, do_cell_matching=True
                    ),
                    accelerator_options=AcceleratorOptions(num_threads=8),
                ),
            ),
            InputFormat.DOCX: WordFormatOption(
                pipeline_cls=SimplePipeline,
            ),
            InputFormat.XLSX: ExcelFormatOption(
                pipeline_cls=SimplePipeline,
            ),
        },
    )
