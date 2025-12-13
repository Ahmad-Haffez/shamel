package com.shamel.flink;

import org.apache.flink.api.common.functions.AggregateFunction;

public class GlobalProtocolAggregator implements AggregateFunction<EnrichedPacket, GlobalProtocolStats, GlobalProtocolStats> {

    @Override
    public GlobalProtocolStats createAccumulator() {
        return new GlobalProtocolStats("", 0L, 0L, "");
    }

    @Override
    public GlobalProtocolStats add(EnrichedPacket packet, GlobalProtocolStats accumulator) {
        if (accumulator.getSecondParty().isEmpty()) {
            accumulator.setSecondParty(packet.getSecondPartyName());
        }
        
        accumulator.setPacketCount(accumulator.getPacketCount() + 1);
        accumulator.setTotalBytes(accumulator.getTotalBytes() + (packet.getLength() != null ? packet.getLength() : 0));
        accumulator.setLastSeen(packet.getTimestamp());
        
        return accumulator;
    }

    @Override
    public GlobalProtocolStats getResult(GlobalProtocolStats accumulator) {
        return accumulator;
    }

    @Override
    public GlobalProtocolStats merge(GlobalProtocolStats a, GlobalProtocolStats b) {
        a.setPacketCount(a.getPacketCount() + b.getPacketCount());
        a.setTotalBytes(a.getTotalBytes() + b.getTotalBytes());
        // Keep the latest timestamp
        if (b.getLastSeen() != null && (a.getLastSeen() == null || b.getLastSeen().compareTo(a.getLastSeen()) > 0)) {
            a.setLastSeen(b.getLastSeen());
        }
        return a;
    }
}
