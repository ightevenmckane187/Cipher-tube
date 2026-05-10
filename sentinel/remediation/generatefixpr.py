import subprocess
import json

def generatefixbranch(findings):
    branch = "sentinel/fix-" + str(len(findings))
    subprocess.run(["git", "checkout", "-b", branch])

    with open("sentinel/reports/latest.json", "w") as f:
        json.dump(findings, f, indent=2)

    subprocess.run(["git", "add", "."])
    subprocess.run(["git", "commit", "-m", "Sentinel: Apply security fixes"])
    # Note: push is disabled in this environment
    # subprocess.run(["git", "push", "--set-upstream", "origin", branch])
    print(f"Created remediation branch: {branch}")

if __name__ == "__main__":
    import sys
    import os
    report_path = "sentinel/reports/latest.json"
    if os.path.exists(report_path):
        with open(report_path, "r") as f:
            findings = json.load(f)
            generatefixbranch(findings)
    else:
        print("No findings report found at sentinel/reports/latest.json")
