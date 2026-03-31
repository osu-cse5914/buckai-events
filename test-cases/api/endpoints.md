# API Endpoint Contract Test Cases

Spec: [`endpoints`](../../specs/api/endpoints.md)

---

## TC-API-001: Unknown API route returns RFC 7807 not-found response

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/api/src/test/app-errors.test.ts`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: A request targets an API path that is not registered
- **When**: The request reaches the Hono app
- **Then**: The API responds with 404 Not Found using RFC 7807 Problem Details and `application/problem+json`

## TC-API-002: Uncaught handler error returns RFC 7807 internal-error response

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/api/src/test/app-errors.test.ts`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: A route handler throws an unhandled exception
- **When**: The request is processed by the Hono app
- **Then**: The API responds with 500 Internal Server Error using RFC 7807 Problem Details and `application/problem+json`
