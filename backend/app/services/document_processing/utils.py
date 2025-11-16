import re
import string


MIN_CONTENT_CHARS = 300
_RE_MULTI_NEWLINE = re.compile(r"\n\s*\n\s*\n+")
_RE_SENTENCE_SPACING = re.compile(r"([.!?])\s*([A-ZÄÖÜ])")


def is_content_sufficient(content: str) -> bool:
    remove_ws = str.maketrans("", "", string.whitespace)
    content_length = len(content.translate(remove_ws))

    return content_length > MIN_CONTENT_CHARS


def clean_content(content: str) -> str:
    # Normalize whitespace but preserve structure
    content = _RE_MULTI_NEWLINE.sub("\n\n", content)
    content = _RE_SENTENCE_SPACING.sub(r"\1 \2", content)
    return content.strip()
