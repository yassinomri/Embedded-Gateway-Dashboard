const CGI_URL = "http://localhost:8080/cgi-bin/credentials.cgi";

async function parseJsonResponse(res: Response) {
  const text = await res.text();

  if (!text || !text.trim()) {
    throw new Error("Empty response from login endpoint");
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON response: ${text}`);
  }
}

export async function login(username: string, password: string) {
  const res = await fetch(`${CGI_URL}?action=login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return parseJsonResponse(res);
}

export async function changeCredentials(username: string, password: string, newPassword: string) {
  const res = await fetch(`${CGI_URL}?action=change`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, currentPassword: password, newPassword }),
  });
  return parseJsonResponse(res);
}
