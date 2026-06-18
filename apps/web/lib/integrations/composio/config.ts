/**
 * Composio requires explicit toolkit versions for manual `tools.execute()` calls.
 * See https://docs.composio.dev/docs/migration-guide/toolkit-versioning
 */
export const COMPOSIO_TOOLKIT_VERSIONS: Record<string, string> = {
  notion:
    process.env.COMPOSIO_TOOLKIT_VERSION_NOTION ?? '20260512_00',
  slack:
    process.env.COMPOSIO_TOOLKIT_VERSION_SLACK ?? '20260512_00',
  linear:
    process.env.COMPOSIO_TOOLKIT_VERSION_LINEAR ?? '20260512_00',
};

export function getComposioClientOptions(apiKey: string) {
  return {
    apiKey,
    toolkitVersions: COMPOSIO_TOOLKIT_VERSIONS,
  };
}
