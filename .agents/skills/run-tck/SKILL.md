# Skill: Run TCK

This skill explains how to run the A2A Protocol Technology Compatibility Kit (TCK) against a System Under Test (SUT).

## Prerequisites

- Python 3.11+
- `uv` installed

## Quick Start

1.  **Install dependencies:**
    ```bash
    uv sync
    ```

2.  **Generate the reference SUT:**
    ```bash
    make tck-codegen
    ```

3.  **Run the TCK suite:**
    ```bash
    make tck-test
    ```

## Adding New Scenarios

1.  Create a new `.feature` file in `scenarios/`.
2.  Use Gherkin syntax to define your scenario.
3.  Add tags like `@must`, `@should`, or `@may` to specify the requirement level.
4.  Run `make tck-codegen` to update the SUT and test hooks.

## Configuring Transports

The TCK supports multiple transports. You can specify the transport to use via environment variables or command-line arguments (once implemented in the runner).

Currently supported:
- `http_json`
