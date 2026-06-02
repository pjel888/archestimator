const publicationCsrfCookieName = "ae_publication_csrf";
const publicationCsrfMaxAgeSeconds = 60 * 60;

function createCsrfToken() {
  const bytes = new Uint8Array(24);
  window.crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function createPublicationCsrfHeaders(): { "x-archestimator-csrf": string } {
  const token = createCsrfToken();
  document.cookie = `${publicationCsrfCookieName}=${token}; Path=/; SameSite=Lax; Max-Age=${publicationCsrfMaxAgeSeconds}`;
  return { "x-archestimator-csrf": token };
}
