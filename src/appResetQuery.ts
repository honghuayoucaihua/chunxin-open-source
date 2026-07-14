export const cleanupResetQueryParam = () => {
  try {
    const url = new URL(globalThis.location.href);
    if (!url.searchParams.has('_reset')) return false;
    url.searchParams.delete('_reset');
    const query = url.searchParams.toString();
    const cleanedUrl = `${url.pathname}${query ? `?${query}` : ''}${url.hash}`;
    globalThis.history.replaceState(globalThis.history.state, '', cleanedUrl);
    return true;
  } catch (error) {
    console.warn('[Storage] cleanup _reset query failed:', error);
  }
  return false;
};
