import { trace, context } from '@opentelemetry/api';

export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
}

interface LogPayload {
  message: string;
  level: LogLevel;
  timestamp: string;
  traceId?: string;
  spanId?: string;
  service: string;
  [key: string]: any;
}

/**
 * Structured Logger utility for OpenTelemetry-compliant logging.
 */
export const logger = {
  log: (level: LogLevel, message: string, meta: Record<string, any> = {}) => {
    const span = trace.getSpan(context.active());
    const traceId = span?.spanContext().traceId;
    const spanId = span?.spanContext().spanId;

    const payload: LogPayload = {
      message,
      level,
      timestamp: new Date().toISOString(),
      service: 'cipher-tube-gateway',
      traceId,
      spanId,
      ...meta,
    };

    // Output as JSON for SIEM ingestion (e.g., Amazon Security Lake)
    console.log(JSON.stringify(payload));
  },

  info: (message: string, meta?: Record<string, any>) => logger.log(LogLevel.INFO, message, meta),
  warn: (message: string, meta?: Record<string, any>) => logger.log(LogLevel.WARN, message, meta),
  error: (message: string, meta?: Record<string, any>) => logger.log(LogLevel.ERROR, message, meta),
  debug: (message: string, meta?: Record<string, any>) => logger.log(LogLevel.DEBUG, message, meta),
};
