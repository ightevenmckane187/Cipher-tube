Feature: Core Operations - Ping
  As an A2A agent
  I want to respond to ping messages
  So that I can demonstrate availability

  @must @core-ops
  Scenario: Successful Ping
    Given the agent is running
    When I send a ping message with ID "123"
    Then the agent should respond with a pong message with ID "123"
