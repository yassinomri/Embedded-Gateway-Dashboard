export async function disconnectDevice(mac: string) {
  const res = await fetch(`/cgi-bin/connected-device.cgi?action=disconnect&mac=${encodeURIComponent(mac)}`);
  if (!res.ok) throw new Error("Failed to disconnect device");
  return res.json();
}

export async function limitBandwidth(mac: string, limitMbps: string) {
  const res = await fetch(`/cgi-bin/connected-device.cgi?action=limit&mac=${encodeURIComponent(mac)}&limit=${encodeURIComponent(limitMbps)}`);
  if (!res.ok) throw new Error("Failed to set bandwidth limit");
  return res.json();
}

export async function getDeviceInfo(mac: string) {
  const res = await fetch(`/cgi-bin/connected-device.cgi?action=info&mac=${encodeURIComponent(mac)}`);
  if (!res.ok) throw new Error("Failed to fetch device info");
  return res.json();
}