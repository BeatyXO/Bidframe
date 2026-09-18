from pathlib import Path
import hashlib

contract = Path(__file__).resolve().parents[1] / "contracts" / "Bidframe.py"
data = contract.read_bytes()
print("contracts/Bidframe.py")
print("sha256:", hashlib.sha256(data).hexdigest())
print("bytes:", len(data))
print("lines:", data.count(b"\n") + 1)
