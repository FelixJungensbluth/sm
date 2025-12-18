
import json
from typing import List, Dict

from langchain_core.output_parsers import PydanticOutputParser

from app.config.logger import logger
from app.models.extracted_data import ExtractedData
from app.llm.provider.base_llm import BaseLLM
from app.services.data_extraction.data_extraction_service import DataExtractionRequest
from app.services.data_extraction.queries import Query


def parse_extracted_data(
    llm_provider: BaseLLM,
    parser: PydanticOutputParser,
    queries: Dict[str, Query],
    results: List[dict],
    data_extraction_requests: List[DataExtractionRequest]
) -> Dict[str, ExtractedData]:
    """
    Parse LLM responses into ExtractedData objects.
    
    Returns a dictionary mapping field names to ExtractedData objects.
    Only includes fields that have a value and pass validation.
    Special fields like 'compact_description' and 'name' are included in the results
    but can be extracted separately by the caller.
    """
    successful_results: Dict[str, ExtractedData] = {}

    for successful_response, req in zip(results, data_extraction_requests):
        field_name = req.field_name
        try:
            output = llm_provider.get_output(successful_response, only_json=True)
            parsed_result: ExtractedData = parser.parse(output)

            # Validate field name matches expected query
            parsed_field_name = parsed_result.field_name
            if parsed_field_name not in queries:
                logger.warning(f"Unexpected field name '{parsed_field_name}' in response (expected '{field_name}')")
                continue

            is_special_field = parsed_field_name in ("compact_description", "name")
            
            if not parsed_result.value:
                logger.debug(f"Field '{parsed_field_name}' has no value, skipping")
                continue

            # For non-special fields, validate required fields
            if not is_special_field:
                if not parsed_result.exact_text:
                    logger.warning(f"Exact text is missing for {parsed_field_name}")
                    continue

                if not parsed_result.source_file:
                    logger.warning(f"Source file not found for {parsed_field_name}")
                    continue

                if not parsed_result.source_file_id:
                    logger.warning(f"Source file id not found for {parsed_field_name}")
                    continue

            # Create ExtractedData object
            extracted_data = ExtractedData(
                value=parsed_result.value,
                source_file=parsed_result.source_file,
                source_file_id=parsed_result.source_file_id,
                exact_text=parsed_result.exact_text,
                field_name=parsed_field_name,
            )

            successful_results[parsed_field_name] = extracted_data

        except Exception as e:
            logger.error(f"Field '{field_name}' failed to parse: {e}")

    return successful_results
