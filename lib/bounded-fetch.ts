// A deadline per request, including the response body. No automatic retries.
export function createBoundedFetch(timeoutMs = 15000, transport: typeof fetch = fetch): typeof fetch {
  return async (input, init) => {
    const controller = new AbortController()
    const source = init?.signal ?? (input instanceof Request ? input.signal : undefined)
    const abort = () => controller.abort(source?.reason)
    if (source?.aborted) abort()
    else source?.addEventListener('abort', abort, { once: true })
    const timer = setTimeout(() => controller.abort(new DOMException('Request timed out', 'TimeoutError')), timeoutMs)
    try {
      const response = await transport(input, { ...init, signal: controller.signal })
      // Text is read as text: React Native's Response turns an ArrayBuffer body back into a string byte by
      // byte (Latin-1), so "é" would become "Ã©". Binary bodies (e.g. image checks on the server) stay bytes.
      const textual = /^(text\/|application\/([\w.+-]*\+)?json)/i.test(response.headers.get('content-type') ?? '')
      const body = textual ? await response.text() : await response.arrayBuffer()
      return new Response([204, 205, 304].includes(response.status) ? null : body, {
        status: response.status, statusText: response.statusText, headers: response.headers,
      })
    } finally {
      clearTimeout(timer)
      source?.removeEventListener('abort', abort)
    }
  }
}
