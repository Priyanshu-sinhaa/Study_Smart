import os
import json
import time
import re
from typing import Optional
from openai import OpenAI
from logger import get_logger

log = get_logger("canvas.ai")

def clean_json_markdown(text: str) -> str:
    """Removes markdown codeblock wrappers like ```json ... ``` from LLM outputs."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    return text

def query_llm(
    prompt: str,
    system_message: str,
    custom_key: Optional[str] = None,
    model_override: Optional[str] = None
) -> dict:
    """
    Queries the OpenAI-compatible LLM endpoint (Groq/Grok/Ollama) and returns a JSON dictionary.
    Includes automatic recovery and fallback for Groq json_validate_failed errors.
    """
    base_url = os.getenv("LLM_BASE_URL", "https://api.groq.com/openai/v1")
    system_key = os.getenv("LLM_API_KEY", "")
    model = model_override if model_override else os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")

    key = custom_key if (custom_key and custom_key.strip()) else system_key

    if not key or not key.strip():
        log.error("No LLM API key configured. Set LLM_API_KEY in .env")
        return {
            "error": "No API Key provided. Please add an API key in the settings panel.",
            "title": "API Key Missing",
            "definition": "The system could not authenticate with the LLM provider.",
            "intuition": "Think of this like trying to start a car without a key.",
            "contextRole": "Add your Groq, xAI, or OpenAI API key in the settings selector to begin.",
            "concepts": []
        }

    key_source = "custom" if (custom_key and custom_key.strip()) else "system"
    log.info(f"LLM call  model={model}  key={key_source}  prompt_len={len(prompt)}")

    client = OpenAI(base_url=base_url, api_key=key)
    start = time.perf_counter()

    try:
        completion = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.6,
            max_tokens=800
        )

        elapsed = (time.perf_counter() - start) * 1000
        usage = completion.usage
        log.info(
            f"LLM done  model={model}  time={elapsed:.0f}ms  "
            f"prompt_tokens={usage.prompt_tokens if usage else '?'}  "
            f"completion_tokens={usage.completion_tokens if usage else '?'}"
        )

        content = completion.choices[0].message.content
        cleaned = clean_json_markdown(content)
        return json.loads(cleaned)

    except Exception as e:
        elapsed = (time.perf_counter() - start) * 1000
        err_str = str(e)
        log.warn(f"LLM strict JSON mode error ({elapsed:.0f}ms): {err_str}")

        # Strategy A: Attempt to recover 'failed_generation' from Groq error body
        if "failed_generation" in err_str:
            try:
                # Extract json payload from exception string
                match = re.search(r"'failed_generation':\s*'(.*)'\}", err_str, re.DOTALL)
                if match:
                    raw_gen = match.group(1)
                    # Unescape unicode and linebreaks
                    raw_gen = raw_gen.replace('\\n', '\n').replace('\\"', '"')
                    cleaned_gen = clean_json_markdown(raw_gen)
                    parsed = json.loads(cleaned_gen)
                    if isinstance(parsed, dict) and ("answer" in parsed or "definition" in parsed or "title" in parsed):
                        log.info("Successfully recovered valid JSON payload from Groq failed_generation error body!")
                        return parsed
            except Exception as rec_err:
                log.debug(f"Recovery from failed_generation attempted but failed: {rec_err}")

        # Strategy B: Retry LLM call without strict response_format json_object
        try:
            log.info("Retrying LLM call without strict json_object constraint...")
            retry_completion = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_message + "\nOutput valid raw JSON ONLY without markdown block ticks."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.5,
                max_tokens=800
            )
            raw_text = retry_completion.choices[0].message.content
            cleaned_text = clean_json_markdown(raw_text)
            parsed_retry = json.loads(cleaned_text)
            log.info("Retry call succeeded and returned valid JSON!")
            return parsed_retry

        except Exception as retry_err:
            log.error(f"Retry LLM call also failed: {retry_err}")
            return {
                "error": err_str,
                "title": "AI Request Failed",
                "definition": f"LLM error: {err_str}",
                "intuition": "Think of this like a radio static interruption.",
                "contextRole": "Try clicking the refresh button on this card or switching LLM models in settings.",
                "concepts": []
            }
