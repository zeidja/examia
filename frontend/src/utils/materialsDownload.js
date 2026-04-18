/**
 * Download a materials file with session cookies. Uses `download=1` so the API sends Content-Disposition: attachment.
 * @param {string} apiPath - e.g. `/materials/definitions/file` (no `/api` prefix)
 * @param {Record<string, string>} query - query params (e.g. `{ path: 'x.docx' }` or `{ subjectId: '...' }`)
 * @param {string} [suggestedFilename] - fallback if server omits Content-Disposition filename
 */
export async function downloadMaterialsFile(apiPath, query = {}, suggestedFilename = 'document') {
  const pathPart = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
  const params = new URLSearchParams({ ...query, download: '1' });
  const url = `/api${pathPart}?${params.toString()}`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    let message = 'Download failed';
    try {
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const j = await res.json();
        message = j.message || message;
      } else {
        const t = await res.text();
        if (t) message = t.slice(0, 200);
      }
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  const cd = res.headers.get('Content-Disposition') || '';
  let filename = suggestedFilename;
  const m = /filename\*?=(?:UTF-8'')?([^;\n]+)/i.exec(cd);
  if (m) {
    try {
      filename = decodeURIComponent(m[1].trim().replace(/^["']|["']$/g, ''));
    } catch {
      filename = m[1].trim().replace(/^["']|["']$/g, '') || suggestedFilename;
    }
  }
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename || suggestedFilename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 4000);
}
