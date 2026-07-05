# cipher-tube.predator

Modular execution engine for FedRAMP High enforcement and Attack Path destruction.

## Features

- **Predator Control-Graph Engine**: Fuses compliance validation with attack path analysis.
- **Hyperscale Support**: Sharded execution for environments with 100k+ assets.
- **Federal Autopilot**: Orchestrates BOD 22-01 and BOD 23-01 workflows.

## Configuration (Knobs)

| Key                       | Default             | Description                                             |
| ------------------------- | ------------------- | ------------------------------------------------------- |
| `predator_schedule`       | `every10_minutes`   | Frequency of the main predator engine loop.             |
| `predator_large_schedule` | `every5minutes`     | Frequency of the hyperscale sharded loop.               |
| `shard_strategy`          | `by-account-region` | How to divide assets for parallel processing.           |
| `max_assets_per_shard`    | `5000`              | Maximum assets processed by a single worker.            |
| `low_risk_sampling_rate`  | `0.2`               | Percentage of low-risk assets to validate (0.0 to 1.0). |
| `remediation_concurrency` | `50`                | Maximum parallel remediation actions.                   |

## Usage

Drop this module into the Cipher-tube OS module registry to activate the predator engine.
