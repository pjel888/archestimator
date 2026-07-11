/**
 * Local, executable ceiling for one collaboration room. This is an admission
 * and message-envelope receipt, not a hosted latency or Cloudflare-billing
 * claim. Hosted proof remains required before raising realtime capacity flags.
 */
export const COLLABORATION_CAPACITY_CONTRACT = {
  maxInboundFramesPerSecondPerConnection: 30,
  maxMessageBytes: 4_096,
  maxRoomConnections: 100,
} as const;

export function calculateCollaborationCapacityReceipt() {
  const maxInboundFramesPerSecond =
    COLLABORATION_CAPACITY_CONTRACT.maxRoomConnections
    * COLLABORATION_CAPACITY_CONTRACT.maxInboundFramesPerSecondPerConnection;

  return {
    maxInboundBytesPerSecond:
      maxInboundFramesPerSecond * COLLABORATION_CAPACITY_CONTRACT.maxMessageBytes,
    maxInboundFramesPerSecond,
    maxOutboundDeliveriesPerSecond:
      maxInboundFramesPerSecond * (COLLABORATION_CAPACITY_CONTRACT.maxRoomConnections - 1),
    maxRoomConnections: COLLABORATION_CAPACITY_CONTRACT.maxRoomConnections,
  };
}
