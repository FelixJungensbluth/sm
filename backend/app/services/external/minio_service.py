import uuid
from io import BytesIO

from fastapi import UploadFile
from minio import Minio
from app.config.settings import SettingsDep


def _get_tender_prefix(tender_id: uuid.UUID) -> str:
    return f"{tender_id}/"


def _create_object_name(tender_id: uuid.UUID, file_id: uuid.UUID) -> str:
    return f"{_get_tender_prefix(tender_id)}{file_id}"


class MinioService:
    def __init__(self, settings: SettingsDep):
        self._bucket = settings.MINIO_BUCKET

        self.__client = Minio(
            settings.MINIO_ENDPOINT,
            settings.MINIO_ACCESS_KEY,
            settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE == "True",
        )

    def upload_tender_file(self, tender_id: uuid.UUID, file: UploadFile, file_id: uuid.UUID):
        file_size = file.size
        content_type = file.content_type

        if not file_size:
            raise ValueError("File size must be set")
        if not content_type:
            raise ValueError("Content type must be set")

        object_name = _create_object_name(tender_id, file_id)
        self.__client.put_object(
            self._bucket, object_name, file.file, file_size, content_type
        )

    def delete_tender_file(self, tender_id: uuid.UUID, file_id: uuid.UUID):
        object_name = _create_object_name(tender_id, file_id)
        self.__client.remove_object(self._bucket, object_name)

    def delete_tender_files(self, tender_id: uuid.UUID):
        objects = self.__client.list_objects(
            self._bucket, prefix=_get_tender_prefix(tender_id), recursive=True
        )
        for obj in objects:
            object_name = obj.object_name
            if not object_name:
                raise ValueError("Object name must be set")
            self.__client.remove_object(self._bucket, object_name)

    def get_tender_files(self, tender_id: uuid.UUID):
        prefix = _get_tender_prefix(tender_id)
        objects = self.__client.list_objects(
            self._bucket,
            prefix=prefix,
            recursive=True,
        )

        for obj in objects:
            if obj.is_dir:
                continue

            if not obj.object_name:
                continue

            response = self.__client.get_object(self._bucket, obj.object_name)
            try:
                yield obj.object_name, response.read()
            finally:
                response.close()
    
    def upload_processed_file(
            self,
            tender_id: uuid.UUID,
            document_name: str,
            content: str,
            content_type: str = "text/plain",
    ) -> None:
        object_name = f"{_get_tender_prefix(tender_id)}processed/{document_name}"

        data = BytesIO(content.encode("utf-8"))
        file_size = data.getbuffer().nbytes

        if not file_size:
            raise ValueError("File size must be set")

        self.__client.put_object(
            self._bucket, object_name, data, file_size, content_type
        )