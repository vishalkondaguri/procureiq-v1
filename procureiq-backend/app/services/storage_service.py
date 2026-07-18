"""
Storage Service — provider-agnostic file upload abstraction.

Supports three backends selected by the STORAGE_PROVIDER env var:

  local     — save files to STORAGE_LOCAL_PATH on disk (default for dev)
  s3        — AWS S3 / any S3-compatible object store (MinIO, Wasabi, etc.)
  ibm_cos   — IBM Cloud Object Storage (also S3-compatible, separate endpoint)

All three backends expose the same async interface:

  upload_file(file: UploadFile, prefix: str) -> StorageResult
  get_url(key: str, expires: int = 3600) -> str
  delete_file(key: str) -> None

Environment variables
─────────────────────
STORAGE_PROVIDER         = local | s3 | ibm_cos

For local:
  STORAGE_LOCAL_PATH     = /tmp/procureiq-uploads  (absolute path)

For s3 / ibm_cos:
  STORAGE_BUCKET         = procureiq-documents
  STORAGE_ENDPOINT_URL   = (optional override — e.g. http://minio:9000)
  STORAGE_ACCESS_KEY     = ...
  STORAGE_SECRET_KEY     = ...
  STORAGE_REGION         = us-south   (IBM COS) | us-east-1  (AWS)
  STORAGE_PRESIGN_EXPIRY = 3600       (seconds)

Backwards-compat shim: if STORAGE_PROVIDER is not set, the service checks the
legacy MINIO_* variables so that existing .env files continue to work.
"""
from __future__ import annotations

import os
import uuid
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from fastapi import UploadFile

logger = logging.getLogger(__name__)


@dataclass
class StorageResult:
    key: str          # object key / relative path
    filename: str     # original filename
    size_bytes: int
    content_type: str
    provider: str     # which backend handled this upload


# ─── Provider detection ────────────────────────────────────────────────────────

def _get_provider() -> str:
    provider = os.getenv("STORAGE_PROVIDER", "").strip().lower()
    if provider in ("s3", "ibm_cos", "local"):
        return provider
    # Backwards-compat: if MINIO_ENDPOINT is set, treat as s3
    if os.getenv("MINIO_ENDPOINT"):
        return "s3"
    return "local"


# ─── Local backend ────────────────────────────────────────────────────────────

async def _upload_local(file: UploadFile, prefix: str) -> StorageResult:
    base = Path(os.getenv("STORAGE_LOCAL_PATH", "/tmp/procureiq-uploads"))
    dest_dir = base / prefix
    dest_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename or "upload").suffix
    key = f"{prefix}/{uuid.uuid4().hex}{ext}"
    dest = base / key

    content = await file.read()
    dest.write_bytes(content)

    logger.info("Local storage: saved %s (%d bytes)", key, len(content))
    return StorageResult(
        key=key,
        filename=file.filename or "upload",
        size_bytes=len(content),
        content_type=file.content_type or "application/octet-stream",
        provider="local",
    )


def _get_url_local(key: str, expires: int = 3600) -> str:
    base = os.getenv("STORAGE_LOCAL_PATH", "/tmp/procureiq-uploads")
    return f"file://{base}/{key}"


def _delete_local(key: str) -> None:
    base = Path(os.getenv("STORAGE_LOCAL_PATH", "/tmp/procureiq-uploads"))
    path = base / key
    if path.exists():
        path.unlink()


# ─── S3-compatible backend (AWS S3, MinIO, IBM COS) ──────────────────────────

def _s3_client():
    """Return a boto3 S3 client configured from environment variables."""
    try:
        import boto3  # type: ignore
        from botocore.config import Config  # type: ignore
    except ImportError as exc:
        raise RuntimeError(
            "boto3 is required for S3/IBM COS storage. "
            "Add it to pyproject.toml: poetry add boto3"
        ) from exc

    provider = _get_provider()

    # Resolve credentials — support both new STORAGE_* and legacy MINIO_* vars
    endpoint = (
        os.getenv("STORAGE_ENDPOINT_URL")
        or (f"http://{os.getenv('MINIO_ENDPOINT')}" if os.getenv("MINIO_ENDPOINT") else None)
    )
    access_key = os.getenv("STORAGE_ACCESS_KEY") or os.getenv("MINIO_ACCESS_KEY", "")
    secret_key = os.getenv("STORAGE_SECRET_KEY") or os.getenv("MINIO_SECRET_KEY", "")
    region     = os.getenv("STORAGE_REGION", "us-south" if provider == "ibm_cos" else "us-east-1")

    kwargs: dict = dict(
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name=region,
        config=Config(signature_version="s3v4"),
    )
    if endpoint:
        kwargs["endpoint_url"] = endpoint

    return boto3.client("s3", **kwargs)


def _bucket() -> str:
    return (
        os.getenv("STORAGE_BUCKET")
        or os.getenv("MINIO_BUCKET", "procureiq-documents")
    )


async def _upload_s3(file: UploadFile, prefix: str) -> StorageResult:
    import asyncio

    ext = Path(file.filename or "upload").suffix
    key = f"{prefix}/{uuid.uuid4().hex}{ext}"
    content = await file.read()

    def _put() -> None:
        client = _s3_client()
        bucket = _bucket()
        # Ensure bucket exists (silently skip if already present)
        try:
            client.head_bucket(Bucket=bucket)
        except Exception:
            try:
                client.create_bucket(Bucket=bucket)
            except Exception:
                pass
        client.put_object(
            Bucket=bucket,
            Key=key,
            Body=content,
            ContentType=file.content_type or "application/octet-stream",
        )

    await asyncio.to_thread(_put)
    logger.info("S3 storage: uploaded %s (%d bytes) to bucket %s", key, len(content), _bucket())
    return StorageResult(
        key=key,
        filename=file.filename or "upload",
        size_bytes=len(content),
        content_type=file.content_type or "application/octet-stream",
        provider=_get_provider(),
    )


def _get_url_s3(key: str, expires: int = 3600) -> str:
    client = _s3_client()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": _bucket(), "Key": key},
        ExpiresIn=expires,
    )


def _delete_s3(key: str) -> None:
    _s3_client().delete_object(Bucket=_bucket(), Key=key)


# ─── Public interface ─────────────────────────────────────────────────────────

async def upload_file(file: UploadFile, prefix: str = "uploads") -> StorageResult:
    """Upload a file using the configured storage provider."""
    provider = _get_provider()
    if provider == "local":
        return await _upload_local(file, prefix)
    return await _upload_s3(file, prefix)


def get_url(key: str, expires: int = 3600) -> str:
    """Return a URL (presigned or file://) for the given object key."""
    provider = _get_provider()
    if provider == "local":
        return _get_url_local(key, expires)
    return _get_url_s3(key, expires)


def delete_file(key: str) -> None:
    """Delete the object at the given key."""
    provider = _get_provider()
    if provider == "local":
        _delete_local(key)
    else:
        _delete_s3(key)


def active_provider() -> str:
    """Return the name of the currently configured storage provider."""
    return _get_provider()
