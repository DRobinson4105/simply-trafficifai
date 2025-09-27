import subprocess
import time
import sys

URL = "https://dis-se19.divas.cloud:8200/chan-11539_h/xflow.m3u8?token=06b8520f635ef2a01826901fe44c2dc861ecaac5fa82168ac6013ccb5eef9dcc"
FFMPEG_CMD = [
    "ffmpeg",
    "-tls_verify", "0",
    "-user_agent", "Mozilla/5.0 (X11; Linux x86_64)",
    "-headers", "Referer: https://fl511.com/\r\n",
    "-i", URL,
    "-t", "1",
    "-c", "copy",
    "-f", "null",
    "-"
]
INTERVAL = 60 * 2

def check_stream():
    result = subprocess.run(
        FFMPEG_CMD,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    return result.returncode == 0

def main():
    while True:
        ok = check_stream()
        if ok:
            print(f"[OK] Stream accessible at {time.strftime('%Y-%m-%d %H:%M:%S')}")
        else:
            print(f"[FAIL] Stream dead at {time.strftime('%Y-%m-%d %H:%M:%S')}")
            sys.exit(0)
        time.sleep(INTERVAL)

if __name__ == "__main__":
    main()
