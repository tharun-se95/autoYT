#!/usr/bin/env python3
import subprocess
import time
import os
import signal
import socket

def is_port_open(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.connect(("127.0.0.1", port))
            return True
        except:
            return False

def kill_port_3000():
    try:
        # Kill any process listening on port 3000
        output = subprocess.check_output(["lsof", "-t", "-i", ":3000"], text=True)
        pids = [int(p) for p in output.splitlines() if p.strip()]
        for pid in pids:
            print(f"🧹 Killing existing process on port 3000: PID {pid}")
            os.kill(pid, signal.SIGKILL)
    except:
        pass

def main():
    cwd = "/Users/tharunk/Documents/Everyday struggles/upgrade-life"
    kill_port_3000()

    # Create fresh env with required dev server options
    dev_env = os.environ.copy()
    dev_env["NODE_OPTIONS"] = "--dns-result-order=ipv4first"
    dev_env["NEXT_TELEMETRY_DISABLED"] = "1"

    print("⚡ Starting Next.js development server...")
    server_proc = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=cwd,
        env=dev_env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )

    print("⌛ Waiting for server to bind to port 3000...")
    server_ready = False
    for i in range(15):
        if is_port_open(3000):
            print("✓ Next.js dev server is up and listening on port 3000!")
            server_ready = True
            break
        time.sleep(1.0)

    if not server_ready:
        print("❌ Server failed to spin up in 15 seconds. Terminating...")
        server_proc.terminate()
        return

    # Check if target channel is passed as command-line argument
    import sys
    target_channel_id = sys.argv[1] if len(sys.argv) > 1 else None

    if target_channel_id:
        channels = [target_channel_id]
        print(f"🎯 Filtered compilation loop to: {target_channel_id}")
    else:
        channels = ["ch_cosmic_archive", "ch_existential_whispers", "ch_techno_bytes", "ch_wealth_blueprint"]
        print("🎯 Running all channels consecutively...")

    try:
        for c in channels:
            print(f"\n🚀 Compiling new continuous-zoom video for {c.upper()}...")
            result = subprocess.run(
                ["python3", "-u", "scripts/generate-channel-video.py", c],
                capture_output=True,
                text=True,
                cwd=cwd
            )
            print(result.stdout)
            if result.stderr:
                print("=== STDERR ===")
                print(result.stderr)
    finally:
        print("\n🧹 Shutting down local Next.js server...")
        server_proc.terminate()
        server_proc.wait()
        kill_port_3000()
        print("✓ Done!")

if __name__ == "__main__":
    main()
