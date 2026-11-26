"""応募用プロフィール（氏名・住所・メール等）の暗号化保存。
保存先: data/profile.enc（暗号化済み） / 鍵: data/secret.key
このデータは外部へ送信しません。フォーム入力支援で、利用者が確認したページにのみ入力されます。"""
from __future__ import annotations

import json
from pathlib import Path

from .crypto import decrypt, encrypt, load_or_create_key

PROFILE_FIELDS = {
    "last_name": "姓",
    "first_name": "名",
    "last_name_kana": "セイ（カナ）",
    "first_name_kana": "メイ（カナ）",
    "email": "メールアドレス",
    "phone": "電話番号",
    "postal_code": "郵便番号",
    "prefecture": "都道府県",
    "city": "市区町村",
    "address1": "番地",
    "address2": "建物名・部屋番号",
    "birth_date": "生年月日(YYYY-MM-DD)",
    "gender": "性別",
}


class ProfileStore:
    def __init__(self, data_dir: Path):
        self.path = data_dir / "profile.enc"
        self.key = load_or_create_key(data_dir / "secret.key")

    def load(self) -> dict:
        if not self.path.exists():
            return {}
        return json.loads(decrypt(self.path.read_bytes(), self.key).decode("utf-8"))

    def save(self, profile: dict) -> None:
        clean = {k: str(v).strip() for k, v in profile.items() if k in PROFILE_FIELDS and v not in (None, "")}
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_bytes(encrypt(json.dumps(clean, ensure_ascii=False).encode("utf-8"), self.key))

    @staticmethod
    def masked(profile: dict) -> dict:
        """画面・ログ表示用（一部を伏せ字）。"""
        out = {}
        for k, v in profile.items():
            s = str(v)
            out[k] = s if len(s) <= 2 else s[:1] + "*" * (len(s) - 2) + s[-1:]
        return out
