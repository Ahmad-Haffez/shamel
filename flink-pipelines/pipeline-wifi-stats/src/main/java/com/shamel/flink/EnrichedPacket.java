package com.shamel.flink;

import com.fasterxml.jackson.annotation.JsonProperty;

public class EnrichedPacket {
    private String timestamp;
    private String sourceIP;
    private String destIP;
    private String sourceHostname;
    private String destHostname;
    private String sourceMAC;
    private String destMAC;
    private String protocol;
    private Integer length;
    
    // Enriched fields
    private String subscriberName;
    private String secondPartyName;
    private String subscriberMachine;
    private String subscriberMAC;
    private String trafficType; // "in" or "out"

    // Getters and setters
    public String getTimestamp() { return timestamp; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }
    
    public String getSourceIP() { return sourceIP; }
    public void setSourceIP(String sourceIP) { this.sourceIP = sourceIP; }
    
    public String getDestIP() { return destIP; }
    public void setDestIP(String destIP) { this.destIP = destIP; }
    
    public String getSourceHostname() { return sourceHostname; }
    public void setSourceHostname(String sourceHostname) { this.sourceHostname = sourceHostname; }
    
    public String getDestHostname() { return destHostname; }
    public void setDestHostname(String destHostname) { this.destHostname = destHostname; }
    
    public String getSourceMAC() { return sourceMAC; }
    public void setSourceMAC(String sourceMAC) { this.sourceMAC = sourceMAC; }
    
    public String getDestMAC() { return destMAC; }
    public void setDestMAC(String destMAC) { this.destMAC = destMAC; }
    
    public String getProtocol() { return protocol; }
    public void setProtocol(String protocol) { this.protocol = protocol; }
    
    public Integer getLength() { return length; }
    public void setLength(Integer length) { this.length = length; }
    
    public String getSubscriberName() { return subscriberName; }
    public void setSubscriberName(String subscriberName) { this.subscriberName = subscriberName; }
    
    public String getSecondPartyName() { return secondPartyName; }
    public void setSecondPartyName(String secondPartyName) { this.secondPartyName = secondPartyName; }
    
    public String getSubscriberMachine() { return subscriberMachine; }
    public void setSubscriberMachine(String subscriberMachine) { this.subscriberMachine = subscriberMachine; }
    
    public String getSubscriberMAC() { return subscriberMAC; }
    public void setSubscriberMAC(String subscriberMAC) { this.subscriberMAC = subscriberMAC; }
    
    public String getTrafficType() { return trafficType; }
    public void setTrafficType(String trafficType) { this.trafficType = trafficType; }
}
