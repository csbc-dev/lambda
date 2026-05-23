// Shared display helpers for the remote-first browser examples. The Lambda
// provider lives server-side (examples/server), so the clients only need to
// parse the payload field and pretty-print the result.

export function parsePayloadText(value) {
  const text = value.trim();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function formatValue(value) {
  if (value === null || value === undefined) {
    return "null";
  }

  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value, null, 2);
}
