
export class AnomalyDashboard {
    getTelemetry() {
        return {
            latency: Math.random() * 20,
            sensorHealth: 'OPTIONAL',
            integrity: 1.0,
            systemState: 'BROADCASTING'
        };
    }
}
