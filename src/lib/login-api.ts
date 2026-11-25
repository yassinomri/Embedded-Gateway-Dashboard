import { NULL_SESSION, UBUS_STATUS, UbusError, ubusCall } from "@/lib/ubus";

/** Session lifetime requested from rpcd, in seconds (renewed on every call). */
const SESSION_TIMEOUT = 1800;

interface SessionLoginResult {
  ubus_rpc_session: string;
  timeout: number;
  expires: number;
  data?: { username?: string };
}

/** Opens an rpcd session. Credentials are checked by rpcd on the gateway. */
export async function login(username: string, password: string): Promise<string> {
  try {
    const result = await ubusCall<SessionLoginResult>(
      "session",
      "login",
      { username, password, timeout: SESSION_TIMEOUT },
      { session: NULL_SESSION }
    );
    return result.ubus_rpc_session;
  } catch (error) {
    if (error instanceof UbusError && error.code === UBUS_STATUS.PERMISSION_DENIED) {
      throw new Error("Invalid username or password");
    }
    if (error instanceof UbusError) throw error;
    throw new Error("Cannot reach the gateway");
  }
}

/** Closes the current rpcd session. */
export async function logout(): Promise<void> {
  await ubusCall("session", "destroy");
}

interface SetPasswordResult {
  success: boolean;
  error?: string;
}

/** Changes a system user's password after the gateway verifies the current one. */
export async function changePassword(
  username: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const result = await ubusCall<SetPasswordResult>("gateway", "set_password", {
    username,
    current_password: currentPassword,
    new_password: newPassword,
  });
  if (!result.success) {
    throw new Error(result.error || "Failed to update the password");
  }
}
