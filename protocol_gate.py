#!/usr/bin/env python3
import sys
import os

PILLARS = ["TRUTH", "PEACE", "VISION", "LOVE", "WILL", "ACTION", "I AM"]

def check_pillars(text):
    text_upper = text.upper()
    found = [p for p in PILLARS if p in text_upper]
    return found

def main():
    print("🛡️ Sentinel Protocol Gate: Active")

    # In a real scenario, this might check git commit messages or PR descriptions.
    # For now, we allow passing a string via argument or stdin.

    input_text = ""
    if len(sys.argv) > 1:
        input_text = " ".join(sys.argv[1:])
    else:
        if not sys.stdin.isatty():
            input_text = sys.stdin.read()

    if not input_text:
        print("❌ Error: No content provided for Pillar validation.")
        sys.exit(1)

    found_pillars = check_pillars(input_text)

    if found_pillars:
        print(f"✅ Pillar Alignment Verified: {', '.join(found_pillars)}")
        print("🚀 Integration Authorized.")
        sys.exit(0)
    else:
        print("❌ Validation Failed: No Sovereign Pillar alignment detected.")
        print("Please ensure your contribution explicitly strengthens at least one of the Seven Pillars.")
        sys.exit(1)

if __name__ == "__main__":
    main()
