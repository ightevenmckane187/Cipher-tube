from __future__ import annotations

from typing import List
from gherkin.parser import Parser as GherkinParser
from codegen.model import Scenario, Step
from codegen.steps import StepResolver


class Parser:
    def __init__(self):
        self.parser = GherkinParser()
        self.resolver = StepResolver()

    def parse_feature(self, feature_text: str) -> List[Scenario]:
        gherkin_document = self.parser.parse(feature_text)
        feature = gherkin_document.get("feature")
        if not feature:
            return []

        scenarios = []
        for child in feature.get("children", []):
            if "scenario" in child:
                gherkin_scenario = child["scenario"]
                scenario = Scenario(
                    name=gherkin_scenario["name"],
                    description=gherkin_scenario.get("description", ""),
                    tags=[tag["name"] for tag in gherkin_scenario.get("tags", [])],
                )
                for gherkin_step in gherkin_scenario.get("steps", []):
                    step_text = gherkin_step["text"]
                    step = Step(text=step_text)
                    trigger, action = self.resolver.resolve(step_text)
                    step.trigger = trigger
                    step.action = action
                    scenario.steps.append(step)
                scenarios.append(scenario)
        return scenarios
