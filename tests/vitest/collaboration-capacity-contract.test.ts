import {
  COLLABORATION_CAPACITY_CONTRACT,
  calculateCollaborationCapacityReceipt,
} from "@/lib/collaboration/capacity-contract";

describe("collaboration local capacity contract", () => {
  it("keeps the Durable Object admission and ingress envelope bounded", () => {
    expect(COLLABORATION_CAPACITY_CONTRACT).toMatchObject({
      maxInboundFramesPerSecondPerConnection: 30,
      maxMessageBytes: 4096,
      maxRoomConnections: 100,
    });

    expect(calculateCollaborationCapacityReceipt()).toEqual({
      maxInboundBytesPerSecond: 12_288_000,
      maxInboundFramesPerSecond: 3_000,
      maxOutboundDeliveriesPerSecond: 297_000,
      maxRoomConnections: 100,
    });
  });
});
