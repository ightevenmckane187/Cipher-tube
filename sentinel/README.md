# Sentinel Security Module

Sentinel is the security orchestration layer of Cipher-tube. It consumes security scan results, normalizes findings, and triggers automated remediation.

## Components

- `ingest/`: Parsers for different security scan formats (e.g., SARIF from EthicalCheck).
- `remediation/`: Logic for generating automated fixes and Pull Requests.
- `reports/`: Storage for the latest normalized security posture.

## Flow

1. Security scans (like EthicalCheck) generate results.
2. Sentinel ingests and parses these results.
3. Sentinel updates the current security posture.
4. Automated remediation tasks are triggered for known issues.
