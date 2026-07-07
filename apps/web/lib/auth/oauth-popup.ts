export type OAuthPopupResult = {
  type: 'oauth_result';
  provider: string;
  error: string | null;
};

/**
 * Escape JSON embedded in a <script type="application/json"> block so a
 * payload cannot break out via </script>.
 */
function jsonForScriptBlock(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

/**
 * Builds a safe OAuth popup completion page. User-controlled strings are
 * never interpolated into executable script source — they live in a
 * JSON script block parsed at runtime.
 */
export function buildOAuthPopupHtml(
  payload: OAuthPopupResult,
  targetOrigin: string
): string {
  const payloadJson = jsonForScriptBlock(payload);
  const originJson = JSON.stringify(targetOrigin);

  return `<!DOCTYPE html>
<html>
  <head><title>Authentication Complete</title></head>
  <body>
    <script id="oauth-payload" type="application/json">${payloadJson}</script>
    <script>
      (function () {
        var payload = JSON.parse(document.getElementById('oauth-payload').textContent);
        var targetOrigin = ${originJson};
        if (window.opener) {
          window.opener.postMessage(payload, targetOrigin);
        }
        window.close();
      })();
    </script>
    <p>Authentication complete. You can close this window.</p>
  </body>
</html>`;
}
