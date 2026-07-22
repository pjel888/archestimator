export const SUPPORT_REALTIME_FIXED_PROTOCOL = "archestimator.support.v2";
export const SUPPORT_REALTIME_CREDENTIAL_PROTOCOL_PREFIX = "archestimator.support.auth.";

export function supportRealtimeProtocols(token: string) {
  return [
    SUPPORT_REALTIME_FIXED_PROTOCOL,
    `${SUPPORT_REALTIME_CREDENTIAL_PROTOCOL_PREFIX}${token}`,
  ] as const;
}
