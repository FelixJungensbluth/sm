import re


def extract_json_from_content(content: str) -> str:
    json_pattern = r'```json\s*(.*?)\s*```'
    match = re.search(json_pattern, content, re.DOTALL)
    if match:
        return match.group(1).strip()
    
    json_object_pattern = r'\{.*\}'
    json_array_pattern = r'\[.*\]'
    for pattern in [json_object_pattern, json_array_pattern]:
        match = re.search(pattern, content, re.DOTALL)
        if match:
            return match.group(0).strip()
    
    return content

