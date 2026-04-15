# API Endpoint Contract Test Cases

Spec: [`endpoints`](../../specs/api/endpoints.md)

---

## TC-API-001: Unknown API route returns RFC 7807 not-found response

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/app-errors.test.ts`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: A request targets an API path that is not registered
- **When**: The request reaches the Hono app
- **Then**: The API responds with 404 Not Found using RFC 7807 Problem Details and `application/problem+json`

## TC-API-002: Uncaught handler error returns RFC 7807 internal-error response

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/app-errors.test.ts`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: A route handler throws an unhandled exception
- **When**: The request is processed by the Hono app
- **Then**: The API responds with 500 Internal Server Error using RFC 7807 Problem Details and `application/problem+json`

## TC-API-003: Versioned API routes can mount under a parent prefix

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/app-routing.test.ts`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: The versioned API router is mounted under a parent path
- **When**: A request targets a versioned endpoint through that parent mount
- **Then**: The request reaches the versioned route handlers without the child routers hardcoding `/api/v1`

## TC-API-004: API health endpoint returns a healthy status payload

- **Spec scenario**: —
- **Type**: Automated
- **Automated in**: `apps/backend/src/test/health-check.test.ts`, `e2e/health.spec.ts`
- **Phase introduced**: 6
- **Regression**: Always
- **Given**: The local application stack is running
- **When**: A client sends `GET /api/health`
- **Then**: The API responds with a successful health payload containing `service`, `status`, and `timestamp`
