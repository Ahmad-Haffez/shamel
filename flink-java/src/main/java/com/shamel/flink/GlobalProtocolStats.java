package com.shamel.flink;

public class GlobalProtocolStats {
    private String protocol;
    private long packetCount;
    private long totalBytes;
    private String lastSeen;

    public GlobalProtocolStats() {}

    public GlobalProtocolStats(String protocol, long packetCount, long totalBytes, String lastSeen) {
        this.protocol = protocol;
        this.packetCount = packetCount;
        this.totalBytes = totalBytes;
        this.lastSeen = lastSeen;
    }

    // Getters and setters
    public String getProtocol() { return protocol; }
    public void setProtocol(String protocol) { this.protocol = protocol; }
    
    public long getPacketCount() { return packetCount; }
    public void setPacketCount(long packetCount) { this.packetCount = packetCount; }
    
    public long getTotalBytes() { return totalBytes; }
    public void setTotalBytes(long totalBytes) { this.totalBytes = totalBytes; }
    
    public String getLastSeen() { return lastSeen; }
    public void setLastSeen(String lastSeen) { this.lastSeen = lastSeen; }

    @Override
    public String toString() {
        return String.format("GlobalProtocolStats{protocol='%s', packets=%d, bytes=%d, lastSeen='%s'}",
                protocol, packetCount, totalBytes, lastSeen);
    }
}
