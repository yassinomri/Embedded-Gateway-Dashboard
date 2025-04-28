export async function fetchCapturedPackets() {
  const response = await fetch('/cgi-bin/packet-analyzer.cgi');
  if (!response.ok) {
    throw new Error('Failed to fetch packets');
  }
  const data = await response.json();
  return data;
}
