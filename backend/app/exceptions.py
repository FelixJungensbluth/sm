"""Custom exception classes for the application."""

from fastapi import HTTPException, status


class AppException(Exception):
    """Base exception for application-specific errors."""
    pass


class NotFoundError(AppException):
    """Raised when a requested resource is not found."""
    pass


class ValidationError(AppException):
    """Raised when validation fails."""
    pass


class DatabaseError(AppException):
    """Raised when a database operation fails."""
    pass


def create_not_found_exception(resource: str, resource_id: str) -> HTTPException:
    """Create a standardized 404 HTTP exception."""
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"{resource} with id '{resource_id}' not found",
    )


def create_validation_exception(detail: str) -> HTTPException:
    """Create a standardized 400 HTTP exception for validation errors."""
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=detail,
    )


def create_internal_server_exception(detail: str = "Internal server error") -> HTTPException:
    """Create a standardized 500 HTTP exception."""
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=detail,
    )








