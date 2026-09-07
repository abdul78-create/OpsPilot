/**
 * EnvironmentConnectionStatus tracks the real connection state of a deployment target.
 *
 * NOT_CONFIGURED    - no target type or metadata has been set
 * CONFIGURED        - target type and metadata saved; no connection test yet run
 * CONNECTION_TESTING - test-connection is currently in progress (transient)
 * CONNECTED         - last connection test succeeded
 * CONNECTION_FAILED  - last connection test returned a failure
 * UNSUPPORTED       - target type set but no driver/integration is available yet
 */
export { EnvironmentConnectionStatus } from '@prisma/client';
