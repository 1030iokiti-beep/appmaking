import functools
import http.server
import sys
import threading
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
FIX = Path(__file__).parent / "fixtures"


class _Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


@pytest.fixture(scope="session")
def server():
    """fixtures/ を http://127.0.0.1:PORT/ で配信（実際の HTTP 取得経路をテストする）"""
    handler = functools.partial(_Quiet, directory=str(FIX))
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    yield f"http://127.0.0.1:{httpd.server_address[1]}"
    httpd.shutdown()


@pytest.fixture
def client():
    from freehunter.http_client import HttpClient
    return HttpClient(min_interval=0, retries=0)


@pytest.fixture
def db(tmp_path):
    from freehunter.db import Database
    return Database(tmp_path / "t.db")
