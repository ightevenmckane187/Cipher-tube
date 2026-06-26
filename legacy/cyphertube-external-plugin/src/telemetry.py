from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.resources import Resource

# Standardize CypherTube Resource tags
resource = Resource(attributes={
    "service.name": "cyphertube-external-plugin",
    "service.branch": "external-plugin-compliant",
    "execution.environment": "dedicated-microvm"
})

provider = MeterProvider(resource=resource)
metrics.set_meter_provider(provider)
meter = metrics.get_meter("cyphertube.analytics.verification")

# Structured Observability Metrics Metrics Setup
provenance_counter = meter.create_counter(
    "data_provenance_verified",
    description="Tracks cryptographically validated data pipeline lineages.",
    unit="1"
)

anomaly_counter = meter.create_counter(
    "poisoning_anomaly_detected",
    description="Tracks mitigated data poisoning patterns or security drops.",
    unit="1"
)

quality_gauge = meter.create_gauge(
    "output_quality_score",
    description="Measures faithfulness/correctness of extracted payloads.",
    unit="percent"
)
