import json

def parse_sarif(path):
    with open(path, "r") as f:
        sarif = json.load(f)

    findings = []

    for run in sarif.get("runs", []):
        for result in run.get("results", []):
            findings.append({
                "ruleId": result.get("ruleId"),
                "severity": result.get("level"),
                "message": result.get("message", {}).get("text"),
                "location": result.get("locations", [{}])[0]
                    .get("physicalLocation", {})
                    .get("artifactLocation", {})
                    .get("uri")
            })

    return findings

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        print(json.dumps(parse_sarif(sys.argv[1]), indent=2))
