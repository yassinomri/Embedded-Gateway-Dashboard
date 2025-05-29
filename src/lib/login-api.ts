const CGI_URL = "http://192.168.1.2/cgi-bin/credentials.cgi";

export async function login(username: string, password: string) {
  const res = await fetch(`${CGI_URL}?action=login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return res.json();
}

export async function changeCredentials(username: string, password: string, newPassword: string) {
  const res = await fetch(`${CGI_URL}?action=change`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, newPassword }),
  });
  return res.json();
}