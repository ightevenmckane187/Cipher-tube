from codegen.parser import Parser
from codegen.python_emitter import PythonEmitter
import os

def generate():
    parser = Parser()
    with open("scenarios/core_operations/ping.feature", "r") as f:
        feature_text = f.read()

    scenarios = parser.parse_feature(feature_text)

    emitter = PythonEmitter(template_dir="codegen/templates/python")
    emitter.emit_sut(scenarios, output_dir="sut/a2a-python")
    print(f"Generated SUT with {len(scenarios)} scenarios in sut/a2a-python/")

if __name__ == "__main__":
    generate()
