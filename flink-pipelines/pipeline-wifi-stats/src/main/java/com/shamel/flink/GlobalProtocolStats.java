package com.shamel.flink;

public class GlobalProtocolStats {
    private String secondParty;
    private long packetCount;
    private long totalBytes;
    private String lastSeen;

    public GlobalProtocolStats() {}

    public GlobalProtocolStats(String secondParty, long packetCount, long totalBytes, String lastSeen) {
        this.secondParty = secondParty;
        this.packetCount = packetCount;
        this.totalBytes = totalBytes;
        this.lastSeen = lastSeen;
    }

    // Getters and setters
    public String getSecondParty() { return secondParty; }
    public void setSecondParty(String secondParty) { this.secondParty = secondParty; }
    
    public long getPacketCount() { return packetCount; }
    public void setPacketCount(long packetCount) { this.packetCount = packetCount; }
    
    public long getTotalBytes() { return totalBytes; }
    public void setTotalBytes(long totalBytes) { this.totalBytes = totalBytes; }
    
    public String getLastSeen() { return lastSeen; }
    public void setLastSeen(String lastSeen) { this.lastSeen = lastSeen; }

    @Override
    public String toString() {
        return String.format("{secondParty='%s', packets=%d, bytes=%d, lastSeen='%s'}",
                secondParty, packetCount, totalBytes, lastSeen);
    }
}
