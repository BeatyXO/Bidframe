"""Work around genlayer-test's open-stdin tempfile cleanup on Windows.

The Direct Mode loader dup2s its temporary message file onto fd 0, closes the
original descriptor, then immediately unlinks the still-open file. Windows
rejects that unlink. Keep the exact loader behavior and defer only that failed
cleanup until process exit so Direct Mode still exercises the contract.
"""

import atexit
import os
import tempfile

import pytest


@pytest.fixture(autouse=True)
def _windows_direct_mode_temp_cleanup(monkeypatch):
    if os.name != "nt":
        return

    original_unlink = os.unlink

    def unlink_or_defer(path, *args, **kwargs):
        try:
            return original_unlink(path, *args, **kwargs)
        except PermissionError:
            # The loader's fd 0 is still using this mkstemp file. Delay just
            # this cleanup; the OS removes the temporary file on process exit.
            if os.path.commonpath((os.path.abspath(path), tempfile.gettempdir())) == os.path.abspath(tempfile.gettempdir()):
                atexit.register(_retry_unlink, original_unlink, path)
                return None
            raise

    monkeypatch.setattr(os, "unlink", unlink_or_defer)


def _retry_unlink(unlink, path):
    try:
        unlink(path)
    except OSError:
        pass
