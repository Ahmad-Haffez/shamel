package com.shamel.flink;

import org.apache.flink.api.common.functions.AggregateFunction;

public class SubscriberProtocolAggregator implements AggregateFunction<EnrichedPacket, SubscriberProtocolStats, SubscriberProtocolStats> {

    @Override
    public SubscriberProtocolStats createAccumulator() {
        return new SubscriberProtocolStats("", 0L, 0L, "");
    }

    @Override
    public SubscriberProtocolStats add(EnrichedPacket packet, SubscriberProtocolStats accumulator) {
        if (accumulator.getSubscriberName().isEmpty()) {
            accumulator.setSubscriberName(packet.getSubscriberName());
            accumulator.setSecondParty(packet.getSecondPartyName());
        }
        
        accumulator.setPacketCount(accumulator.getPacketCount() + 1);
        accumulator.setTotalBytes(accumulator.getTotalBytes() + (packet.getLength() != null ? packet.getLength() : 0));
        accumulator.setLastSeen(packet.getTimestamp());
        
        return accumulator;
    }

    @Override
    public SubscriberProtocolStats getResult(SubscriberProtocolStats accumulator) {
        return accumulator;
    }

    @Override
    public SubscriberProtocolStats merge(SubscriberProtocolStats a, SubscriberProtocolStats b) {
        a.setPacketCount(a.getPacketCount() + b.getPacketCount());
        a.setTotalBytes(a.getTotalBytes() + b.getTotalBytes());
        
        // Keep the latest timestamp
        if (b.getLastSeen() != null && (a.getLastSeen() == null || b.getLastSeen().compareTo(a.getLastSeen()) > 0)) {
            a.setLastSeen(b.getLastSeen());
        }
        return a;
    }
}
