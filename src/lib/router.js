/**
 * Matches a URL path against a route pattern containing `:param` segments.
 * Returns the extracted params object (empty for a static pattern), or
 * null if the pattern and path have a different number of segments or a
 * static segment doesn't match. A trailing slash on either side is ignored.
 */
export function matchPath(pattern, path) {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = path.split('/').filter(Boolean);
  if (patternParts.length !== pathParts.length) return null;

  const params = {};
  for (let i = 0; i < patternParts.length; i++) {
    const part = patternParts[i];
    if (part.startsWith(':')) {
      params[part.slice(1)] = decodeURIComponent(pathParts[i]);
    } else if (part !== pathParts[i]) {
      return null;
    }
  }
  return params;
}
