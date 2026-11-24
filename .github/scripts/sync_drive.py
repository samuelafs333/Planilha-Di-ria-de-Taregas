#!/usr/bin/env python3
"""Sincroniza arquivos adicionados ou modificados no GitHub para o Google Drive.

Envia cada arquivo alterado para um Web App do Google Apps Script, que cria
subpastas automaticamente e adiciona ou atualiza os arquivos dentro da pasta
"Planilha Diária de Tarefas" no Google Drive.
"""

from __future__ import annotations

import base64
import json
import mimetypes
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

DEFAULT_FOLDER_ID = "1D89YqTGSKaA2bvUdupbfAknGM9jyy9rL"
MAX_FILE_BYTES = 30 * 1024 * 1024  # 30 MB (~40 MB em base64, abaixo do limite de 50 MB do Apps Script)
MAX_RETRIES = 3

IGNORED_PREFIXES = (".git/", ".github/")
IGNORED_FILENAMES = {".DS_Store", "Thumbs.db"}

TEXT_EXTENSIONS = {
    ".html",
    ".htm",
    ".css",
    ".js",
    ".mjs",
    ".cjs",
    ".ts",
    ".tsx",
    ".jsx",
    ".json",
    ".md",
    ".txt",
    ".svg",
    ".xml",
    ".yml",
    ".yaml",
    ".csv",
    ".tsv",
    ".gitignore",
    ".py",
    ".sh",
    ".sql",
    ".gs",
}

MIME_OVERRIDES = {
    ".js": "application/javascript",
    ".mjs": "application/javascript",
    ".cjs": "application/javascript",
    ".json": "application/json",
    ".md": "text/markdown",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".html": "text/html",
    ".css": "text/css",
}


def should_ignore(rel_path: str) -> bool:
    normalized = rel_path.replace("\\", "/")
    while normalized.startswith("./"):
        normalized = normalized[2:]
    if not normalized:
        return True
    if any(normalized.startswith(prefix) for prefix in IGNORED_PREFIXES):
        return True
    if Path(normalized).name in IGNORED_FILENAMES:
        return True
    return False


def run_git_z(args: list[str]) -> list[str]:
    result = subprocess.run(
        ["git", "-c", "core.quotepath=false", *args],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    raw = result.stdout.decode("utf-8", errors="strict")
    return [entry for entry in raw.split("\0") if entry]


def commit_exists(sha: str) -> bool:
    if not sha or sha == "0" * 40:
        return False
    res = subprocess.run(
        ["git", "cat-file", "-e", f"{sha}^{{commit}}"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return res.returncode == 0


def collect_files(sync_all: bool, before_sha: str, after_sha: str) -> list[str]:
    if not sync_all and commit_exists(before_sha) and commit_exists(after_sha):
        print(f"Detectando arquivos adicionados/modificados entre {before_sha[:7]} e {after_sha[:7]}...")
        candidates = run_git_z(
            ["diff", "--name-only", "--diff-filter=ACMR", "-z", before_sha, after_sha]
        )
    else:
        print("Listando todos os arquivos rastreados do projeto para sincronização completa...")
        candidates = run_git_z(["ls-files", "-z"])

    files = []
    for rel_path in candidates:
        normalized = rel_path.replace("\\", "/")
        if should_ignore(normalized):
            continue
        if Path(normalized).is_file():
            files.append(normalized)
    return sorted(set(files))


def detect_mime_and_text(file_path: Path, raw_bytes: bytes) -> tuple[str, bool]:
    ext = file_path.suffix.lower()
    mime_type = MIME_OVERRIDES.get(ext) or mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"

    is_text = False
    if ext in TEXT_EXTENSIONS:
        try:
            raw_bytes.decode("utf-8")
            is_text = True
        except UnicodeDecodeError:
            is_text = False
    return mime_type, is_text


def post_file(
    webhook_url: str,
    secret: str,
    folder_id: str,
    rel_path: str,
    raw_bytes: bytes,
) -> dict:
    file_path = Path(rel_path)
    mime_type, is_text = detect_mime_and_text(file_path, raw_bytes)

    payload = {
        "secret": secret,
        "folderId": folder_id,
        "path": rel_path,
        "mimeType": mime_type,
        "isText": is_text,
        "contentBase64": base64.b64encode(raw_bytes).decode("ascii"),
    }
    body = json.dumps(payload).encode("utf-8")

    last_error: Exception | None = None
    for attempt in range(1, MAX_RETRIES + 1):
        req = urllib.request.Request(
            webhook_url,
            data=body,
            headers={"Content-Type": "application/json; charset=utf-8"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                resp_text = resp.read().decode("utf-8", errors="replace")
            try:
                data = json.loads(resp_text)
            except json.JSONDecodeError as exc:
                snippet = resp_text[:300].replace("\n", " ")
                raise RuntimeError(
                    "Resposta não-JSON do Google Apps Script. Verifique se o Web App foi "
                    "implantado com 'Quem pode acessar: Qualquer pessoa' e se a URL termina "
                    f"em '/exec'. Trecho recebido: {snippet}"
                ) from exc

            if not data.get("ok"):
                raise RuntimeError(f"Erro retornado pelo Apps Script: {data.get('error', data)}")
            return data

        except (urllib.error.URLError, TimeoutError, RuntimeError) as exc:
            last_error = exc
            if attempt < MAX_RETRIES:
                wait_seconds = 2 ** attempt
                print(
                    f"  [tentativa {attempt}/{MAX_RETRIES}] Falha ao enviar {rel_path}: {exc}. "
                    f"Tentando novamente em {wait_seconds}s..."
                )
                time.sleep(wait_seconds)
            else:
                break

    raise RuntimeError(f"Falha definitiva ao sincronizar '{rel_path}': {last_error}")


def main() -> int:
    webhook_url = os.environ.get("GDRIVE_WEBHOOK_URL", "").strip()
    secret = os.environ.get("GDRIVE_SYNC_SECRET", "").strip()
    folder_id = os.environ.get("GDRIVE_FOLDER_ID", DEFAULT_FOLDER_ID).strip() or DEFAULT_FOLDER_ID
    sync_all = os.environ.get("SYNC_ALL", "false").lower() == "true"
    before_sha = os.environ.get("BEFORE_SHA", "").strip()
    after_sha = os.environ.get("AFTER_SHA", "HEAD").strip()

    missing = []
    if not webhook_url:
        missing.append("GDRIVE_WEBHOOK_URL")
    if not secret:
        missing.append("GDRIVE_SYNC_SECRET")

    if missing:
        print(
            "::error::Secrets não configurados no GitHub: "
            + ", ".join(missing)
            + ". Siga o passo a passo em .github/SYNC_GOOGLE_DRIVE.md para ativar a sincronização automática.",
            file=sys.stderr,
        )
        return 1

    files = collect_files(sync_all=sync_all, before_sha=before_sha, after_sha=after_sha)
    if not files:
        print("Nenhum arquivo adicionado ou modificado para sincronizar.")
        return 0

    print(f"Sincronizando {len(files)} arquivo(s) para a pasta do Drive ({folder_id})...")
    synced = 0
    for rel_path in files:
        raw_bytes = Path(rel_path).read_bytes()
        if len(raw_bytes) > MAX_FILE_BYTES:
            print(
                f"::warning::Pulando '{rel_path}' ({len(raw_bytes)} bytes) porque ultrapassa o limite de 30 MB.",
                file=sys.stderr,
            )
            continue

        result = post_file(
            webhook_url=webhook_url,
            secret=secret,
            folder_id=folder_id,
            rel_path=rel_path,
            raw_bytes=raw_bytes,
        )
        action = result.get("action", "synced")
        file_id = result.get("fileId", "")
        print(f"  ✓ [{action}] {rel_path} (ID: {file_id})")
        synced += 1

    print(f"Sincronização concluída com sucesso! {synced} arquivo(s) atualizado(s) no Google Drive.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
