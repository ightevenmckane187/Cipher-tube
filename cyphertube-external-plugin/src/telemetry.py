class MockCounter:
    def add(self, value, tags):
        pass

class MockGauge:
    def set(self, value, tags):
        pass

provenance_counter = MockCounter()
anomaly_counter = MockCounter()
quality_gauge = MockGauge()
