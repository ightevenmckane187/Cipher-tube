## 2026-04-17 - Sanitized Redis Error Logging
**Vulnerability:** Potential credential leakage in logs via raw Redis error objects.
**Learning:** Default error objects in some libraries (like Redis) can contain connection strings including passwords if the connection fails.
**Prevention:** Always log only the `err.message` or specific sanitized fields when handling database connection errors, rather than the entire error object.

## 2026-04-18 - Rate Limiting Database-Accessing Endpoints
**Vulnerability:** Denial of Service (DoS) risk on endpoints performing database operations.
**Learning:** CodeQL and other security scanners flags endpoints that perform database access without rate limiting as high severity risks.
**Prevention:** Always apply rate limiting (e.g., using 'express-rate-limit') to any route that interacts with a database or external service.
