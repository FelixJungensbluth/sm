import asyncio
import random
import time
from dataclasses import dataclass
from typing import List

import aiohttp
import tiktoken

from app.config.logger import logger


@dataclass
class StatusTracker:
    num_tasks_started: int = 0
    num_tasks_in_progress: int = 0
    num_tasks_succeeded: int = 0
    num_tasks_failed: int = 0
    num_rate_limit_errors: int = 0
    num_api_errors: int = 0
    num_other_errors: int = 0
    last_rate_limit_error_time: float = 0.0


@dataclass
class APIRequest:
    task_id: int
    request_json: dict
    token_consumption: int
    attempts_left: int
    backoff_base_seconds: float = 1.5

    async def call_api(
        self,
        session: aiohttp.ClientSession,
        request_url: str,
        request_header: dict,
        retry_queue: asyncio.Queue,
        results: list,
        status_tracker: StatusTracker,
    ):
        error = None
        response_json = None

        try:
            async with session.post(
                url=request_url, headers=request_header, json=self.request_json
            ) as response:
                response_json = await response.json()

            if response.status == 429:
                logger.warning(f"Request {self.task_id} rate limited.")
                error = response_json
                status_tracker.num_rate_limit_errors += 1
                status_tracker.last_rate_limit_error_time = time.time()

            elif response.status >= 400:
                logger.error(
                    f"Request {self.task_id} API error {response.status}: {response_json}"
                )
                error = response_json
                status_tracker.num_api_errors += 1

        except Exception as e:
            logger.error(f"Request {self.task_id} Exception: {e}")
            error = str(e)
            status_tracker.num_other_errors += 1

        if error:
            if self.attempts_left > 0:
                backoff_seconds = self.backoff_base_seconds * (
                    2 ** (3 - self.attempts_left)
                ) + random.uniform(0, 1)
                logger.info(
                    f"Retrying request {self.task_id} after {backoff_seconds:.2f}s backoff"
                )
                await asyncio.sleep(backoff_seconds)
                self.attempts_left -= 1
                await retry_queue.put(self)
            else:
                status_tracker.num_tasks_in_progress -= 1
                status_tracker.num_tasks_failed += 1
                results.append({"task_id": self.task_id, "error": error})
                logger.error(f"Request {self.task_id} permanently failed.")
        else:
            status_tracker.num_tasks_in_progress -= 1
            status_tracker.num_tasks_succeeded += 1
            results.append({"task_id": self.task_id, "response": response_json})


def num_tokens_consumed_from_request(
    request_json: dict, token_encoding_name: str
) -> int:
    encoding = tiktoken.get_encoding(token_encoding_name)
    num_tokens = 0

    # Support both "input" and "messages" formats
    messages = request_json.get("messages", request_json.get("input", []))

    for message in messages:
        num_tokens += 4
        for key, value in message.items():
            if isinstance(value, str):
                num_tokens += len(encoding.encode(value))
            if key == "name":
                num_tokens -= 1
    num_tokens += 2
    max_tokens = request_json.get("max_tokens", 15)
    return num_tokens + max_tokens


def task_id_generator_function():
    task_id = 0
    while True:
        yield task_id
        task_id += 1


async def process_api_requests(
    requests: List[dict],
    request_url: str,
    api_key: str,
    max_requests_per_minute: float,
    max_tokens_per_minute: float,
    token_encoding_name: str,
    max_attempts: int,
) -> List[dict]:
    max_concurrent_requests = 10
    base_cooldown_seconds = 15
    seconds_to_sleep_each_loop = 0.05

    # Only add Authorization header if API key is provided
    request_header = {}
    if api_key:
        request_header["Authorization"] = f"Bearer {api_key}"

    request_header["X-Loop-Project"] = "sm"
    queue_of_requests_to_retry = asyncio.Queue()
    task_id_generator = task_id_generator_function()
    status_tracker = StatusTracker()
    next_request = None

    available_request_capacity = max_requests_per_minute
    available_token_capacity = max_tokens_per_minute
    last_update_time = time.time()

    requests_not_finished = True
    requests_iter = iter(requests)
    results = []
    in_flight_tasks = set()

    async with aiohttp.ClientSession() as session:
        while True:
            now = time.time()
            elapsed = now - last_update_time
            last_update_time = now

            available_request_capacity = min(
                available_request_capacity + (max_requests_per_minute * elapsed / 60.0),
                max_requests_per_minute,
            )
            available_token_capacity = min(
                available_token_capacity + (max_tokens_per_minute * elapsed / 60.0),
                max_tokens_per_minute,
            )

            if next_request is None:
                if not queue_of_requests_to_retry.empty():
                    next_request = await queue_of_requests_to_retry.get()
                elif requests_not_finished:
                    try:
                        request_json = next(requests_iter)
                        next_request = APIRequest(
                            task_id=next(task_id_generator),
                            request_json=request_json,
                            token_consumption=num_tokens_consumed_from_request(
                                request_json, token_encoding_name
                            ),
                            attempts_left=max_attempts,
                        )
                        status_tracker.num_tasks_started += 1
                        status_tracker.num_tasks_in_progress += 1
                    except StopIteration:
                        requests_not_finished = False

            if next_request:
                if (
                    available_request_capacity >= 1
                    and available_token_capacity >= next_request.token_consumption
                    and len(in_flight_tasks) < max_concurrent_requests
                ):
                    available_request_capacity -= 1
                    available_token_capacity -= next_request.token_consumption

                    task = asyncio.create_task(
                        next_request.call_api(
                            session=session,
                            request_url=request_url,
                            request_header=request_header,
                            retry_queue=queue_of_requests_to_retry,
                            results=results,
                            status_tracker=status_tracker,
                        )
                    )
                    in_flight_tasks.add(task)
                    task.add_done_callback(in_flight_tasks.discard)
                    next_request = None

            if (
                status_tracker.num_tasks_in_progress == 0
                and not requests_not_finished
                and queue_of_requests_to_retry.empty()
            ):
                if in_flight_tasks:
                    await asyncio.gather(*in_flight_tasks)
                break

            if status_tracker.last_rate_limit_error_time:
                time_since_last_rl = (
                    time.time() - status_tracker.last_rate_limit_error_time
                )
                if time_since_last_rl < base_cooldown_seconds:
                    cooldown_remaining = base_cooldown_seconds - time_since_last_rl
                    logger.info(
                        f"Cooling down for {cooldown_remaining:.1f}s due to 429s..."
                    )
                    await asyncio.sleep(cooldown_remaining)
                    status_tracker.last_rate_limit_error_time = 0

            await asyncio.sleep(seconds_to_sleep_each_loop)

    results.sort(key=lambda r: r["task_id"])  # preserve original order

    logger.info(
        f"Openai AI Requets finished: {status_tracker.num_tasks_succeeded} succeeded, {status_tracker.num_tasks_failed} failed."
    )
    return results


class RequestProcessor:
    def __init__(
        self,
        request_url: str,
        api_key: str,
        max_requests_per_minute: float,
        max_tokens_per_minute: float,
        token_encoding_name: str = "cl100k_base",
    ):
        """
        Initialize the request processor with API configuration.

        Args:
            request_url: The API endpoint URL
            api_key: API key for authentication
            max_requests_per_minute: Maximum requests per minute rate limit
            max_tokens_per_minute: Maximum tokens per minute rate limit
            token_encoding_name: Token encoding name (default: "cl100k_base")
        """
        self._request_url = request_url
        self._api_key = api_key
        self._max_requests_per_minute = max_requests_per_minute
        self._max_tokens_per_minute = max_tokens_per_minute
        self._token_encoding_name = token_encoding_name

    async def process_requests(
        self, requests: List[dict], max_attempts: int = 2
    ) -> List[dict]:
        results = await process_api_requests(
            requests=requests,
            request_url=self._request_url,
            api_key=self._api_key,
            max_requests_per_minute=self._max_requests_per_minute,
            max_tokens_per_minute=self._max_tokens_per_minute,
            token_encoding_name=self._token_encoding_name,
            max_attempts=max_attempts,
        )
        successful_responses = [r for r in results if "response" in r]

        return successful_responses
