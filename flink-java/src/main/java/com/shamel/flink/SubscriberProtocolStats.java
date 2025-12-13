package com.shamel.flink;

import java.util.Set;
import java.util.HashSet;

public class SubscriberProtocolStats {
    private String subscriberName;
    private String SecondParty;
    // private Set<String> protocols;
    private long packetCount;
    private long totalBytes;
    private String lastSeen;

    public SubscriberProtocolStats() {
        // this.protocols = new HashSet<>();
    }

    public SubscriberProtocolStats(String subscriberName,long packetCount, long totalBytes, String lastSeen) {
        this.subscriberName = subscriberName;
        this.SecondParty = "";
        // this.protocols = new HashSet<>();
        this.packetCount = packetCount;
        this.totalBytes = totalBytes;
        this.lastSeen = lastSeen;
    }

    // Getters and setters
    public String getSubscriberName() { return subscriberName; }
    public void setSubscriberName(String subscriberName) { this.subscriberName = subscriberName; }
    
    public String getSecondParty() { return SecondParty; }
    public void setSecondParty(String SecondParty) { this.SecondParty = SecondParty; }
    
    // public String getProtocol() { return String.join(", ",protocols); }
    // public void setProtocol(String protocol) { this.protocols.add(protocol); }
    
    public long getPacketCount() { return packetCount; }
    public void setPacketCount(long packetCount) { this.packetCount = packetCount; }
    
    public long getTotalBytes() { return totalBytes; }
    public void setTotalBytes(long totalBytes) { this.totalBytes = totalBytes; }
    
    public String getLastSeen() { return lastSeen; }
    public void setLastSeen(String lastSeen) { this.lastSeen = lastSeen; }

    @Override
    public String toString() {
        return String.format("{subscriber='%s', SP='%s', bytes=%d}",
                subscriberName, SecondParty,  totalBytes);
    }
}
