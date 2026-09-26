// Static Pages builds deliberately never contact a backend or accept API keys.
export async function loadRuntime(mode, fetchImpl = globalThis.fetch) {
  if (mode === 'static') return { staticMode: true, aiEnabled: false, pinRequired: false, token: null };
  const response = await fetchImpl('./api/config');
  if (!response.ok) throw new Error('Server unavailable');
  return { ...await response.json(), staticMode: false };
}
