"""個人情報の暗号化（Fernet = AES-128-CBC + HMAC-SHA256）。

鍵の場所:
- 環境変数 FH_SECRET_KEY があればそれを使用（VPS 等）
- 無ければ data/secret.key を自動生成して使用
※ secret.key を失うとプロフィールは復号できません。バックアップは鍵と別の場所へ。
"""
from __future__ import annotations

import os
from pathlib import Path

from cryptography.fernet import Fernet, InvalidToken


def load_or_create_key(key_path: Path) -> bytes:
    env = os.environ.get("FH_SECRET_KEY")
    if env:
        return env.encode()
    if key_path.exists():
        return key_path.read_bytes().strip()
    key_path.parent.mkdir(parents=True, exist_ok=True)
    key = Fernet.generate_key()
    key_path.write_bytes(key)
    try:
        os.chmod(key_path, 0o600)
    except OSError:
        pass
    return key


def encrypt(data: bytes, key: bytes) -> bytes:
    return Fernet(key).encrypt(data)


def decrypt(token: bytes, key: bytes) -> bytes:
    try:
        return Fernet(key).decrypt(token)
    except InvalidToken as e:
        raise ValueError("復号に失敗しました（鍵が違うかファイルが壊れています）") from e
