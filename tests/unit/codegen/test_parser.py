from codegen.parser import Parser
from codegen.model import Scenario

def test_parse_ping_feature():
    parser = Parser()
    feature_text = """
Feature: Ping
  Scenario: Successful Ping
    When I send a ping message with ID "123"
    Then the agent should respond with a pong message with ID "123"
"""
    scenarios = parser.parse_feature(feature_text)
    assert len(scenarios) == 1
    assert scenarios[0].name == "Successful Ping"
    assert len(scenarios[0].steps) == 2
    assert scenarios[0].steps[0].action.type == "SEND_PING"
    assert scenarios[0].steps[0].action.params["id"] == "123"
    assert scenarios[0].steps[1].trigger.type == "RECEIVE_PONG"
    assert scenarios[0].steps[1].trigger.params["id"] == "123"
