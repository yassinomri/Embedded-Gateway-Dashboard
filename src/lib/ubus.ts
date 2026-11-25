// Minimal client for OpenWrt's ubus JSON-RPC endpoint (uhttpd-mod-ubus + rpcd).
//
// Every request carries an rpcd session id. rpcd checks each call against the
// session's ACL on the gateway, so the browser never holds the password.

const UBUS_URL: string = import.meta.env.VITE_UBUS_URL ?? "/ubus";

/** Session id used before login; rpcd only allows "session login" with it. */
export const NULL_SESSION = "00000000000000000000000000000000";

// ubus status codes (libubus: enum ubus_msg_status)
export const UBUS_STATUS = {
  OK: 0,
  INVALID_COMMAND: 1,
  INVALID_ARGUMENT: 2,
  METHOD_NOT_FOUND: 3,
  NOT_FOUND: 4,
  NO_DATA: 5,
  PERMISSION_DENIED: 6,
  TIMEOUT: 7,
  NOT_SUPPORTED: 8,
  UNKNOWN_ERROR: 9,
  CONNECTION_FAILED: 10,
} as const;

/** JSON-RPC error uhttpd returns when the session is invalid or expired. */
const RPC_ACCESS_DENIED = -32002;

const STATUS_MESSAGES: Record<number, string> = {
  1: "Invalid command",
  2: "Invalid argument",
  3: "Method not found",
  4: "Object not found",
  5: "No data",
  6: "Permission denied",
  7: "Request timed out",
  8: "Operation not supported",
  9: "Unknown error",
  10: "Connection failed",
};

export class UbusError extends Error {
  constructor(public readonly code: number, message?: string) {
    super(message ?? STATUS_MESSAGES[code] ?? `ubus error ${code}`);
    this.name = "UbusError";
  }

  get isAuthError(): boolean {
    return this.code === UBUS_STATUS.PERMISSION_DENIED || this.code === RPC_ACCESS_DENIED;
  }
}

let currentSession: string | null = null;
let sessionExpiredHandler: (() => void) | null = null;
let requestId = 0;

export function setSession(sid: string | null) {
  currentSession = sid;
}

export function onSessionExpired(handler: (() => void) | null) {
  sessionExpiredHandler = handler;
}

interface CallOptions {
  /** Override the session id (e.g. NULL_SESSION for login). */
  session?: string;
  timeoutMs?: number;
}

export async function ubusCall<T = Record<string, unknown>>(
  object: string,
  method: string,
  args: Record<string, unknown> = {},
  { session, timeoutMs = 10000 }: CallOptions = {}
): Promise<T> {
  const sid = session ?? currentSession ?? NULL_SESSION;

  const response = await fetch(UBUS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: ++requestId,
      method: "call",
      params: [sid, object, method, args],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`Gateway returned HTTP ${response.status}`);
  }

  const body = await response.json();

  let error: UbusError | null = null;
  if (body.error) {
    error = new UbusError(body.error.code, body.error.message);
  } else if (!Array.isArray(body.result)) {
    error = new UbusError(UBUS_STATUS.UNKNOWN_ERROR, "Malformed ubus response");
  } else if (body.result[0] !== UBUS_STATUS.OK) {
    error = new UbusError(body.result[0]);
  }

  if (error) {
    // A rejected call on a real session means it expired or was revoked.
    if (error.isAuthError && sid !== NULL_SESSION) {
      sessionExpiredHandler?.();
    }
    throw error;
  }

  return (body.result[1] ?? {}) as T;
}
