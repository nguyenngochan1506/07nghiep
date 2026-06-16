export function createSSEConnection(
  url: string,
  onEvent: (event: string, data: string) => void,
  signal: AbortSignal,
) {
  fetch(url, {
    headers: { Accept: "text/event-stream" },
    credentials: "include",
    signal,
  })
    .then(async (response) => {
      if (!response.ok || !response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        let eventType = "";
        let data = "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            data = line.slice(6);
          } else if (line === "" && eventType) {
            onEvent(eventType, data);
            eventType = "";
            data = "";
          }
        }
      }
    })
    .catch(() => {
      // Connection closed or aborted
    });
}
