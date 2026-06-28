export const AUTH_VERIFIED_REQUEST_HEADER = "x-archestimator-auth-verified";
export const AUTH_VERIFIED_REQUEST_HEADER_VALUE = "proxy";
export const TERMS_ACCEPTED_REQUEST_HEADER = "x-archestimator-terms-accepted";
export const TERMS_ACCEPTED_REQUEST_HEADER_VALUE = "current";

type ProtectedRouteGateState = {
  authVerified?: boolean;
  termsAccepted?: boolean;
};

export function clearProtectedRouteGateRequestHeaders(headers: Headers) {
  headers.delete(AUTH_VERIFIED_REQUEST_HEADER);
  headers.delete(TERMS_ACCEPTED_REQUEST_HEADER);
}

export function markProtectedRouteGateRequestHeaders(headers: Headers, state: ProtectedRouteGateState) {
  if (state.authVerified) {
    headers.set(AUTH_VERIFIED_REQUEST_HEADER, AUTH_VERIFIED_REQUEST_HEADER_VALUE);
  }

  if (state.termsAccepted) {
    headers.set(TERMS_ACCEPTED_REQUEST_HEADER, TERMS_ACCEPTED_REQUEST_HEADER_VALUE);
  }
}

export function isProtectedRouteGateSatisfied(
  headers: Headers,
  { termsRequired = true }: { termsRequired?: boolean } = {},
) {
  if (headers.get(AUTH_VERIFIED_REQUEST_HEADER) !== AUTH_VERIFIED_REQUEST_HEADER_VALUE) {
    return false;
  }

  if (termsRequired && headers.get(TERMS_ACCEPTED_REQUEST_HEADER) !== TERMS_ACCEPTED_REQUEST_HEADER_VALUE) {
    return false;
  }

  return true;
}
