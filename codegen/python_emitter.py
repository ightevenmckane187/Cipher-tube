from __future__ import annotations

import os
from jinja2 import Environment, FileSystemLoader
from codegen.model import Scenario


class PythonEmitter:
    def __init__(self, template_dir: str):
        self.env = Environment(loader=FileSystemLoader(template_dir))

    def emit_sut(self, scenarios: list[Scenario], output_dir: str):
        template = self.env.get_template("sut_template.j2")
        content = template.render(scenarios=scenarios)

        os.makedirs(output_dir, exist_ok=True)
        with open(os.path.join(output_dir, "sut.py"), "w") as f:
            f.write(content)
