package com.shamel.flink;

import com.fasterxml.jackson.annotation.JsonProperty;

public class WifiPacket {
    @JsonProperty("timestamp")
    private String timestamp;
    
    @JsonProperty("sourceIP")
    private String sourceIP;
    
    @JsonProperty("destIP")
    private String destIP;
    
    @JsonProperty("sourceHostname")
    private String sourceHostname;
    
    @JsonProperty("destHostname")
    private String destHostname;
    
    @JsonProperty("sourceMAC")
    private String sourceMAC;
    
    @JsonProperty("destMAC")
    private String destMAC;
    
    @JsonProperty("protocols")
    private String protocol;
    
    @JsonProperty("sourcePort")
    private String sourcePort;
    
    @JsonProperty("destPort")
    private String destPort;
    
    @JsonProperty("frameLen")
    private Integer length;

    // Getters and setters
    public String getTimestamp() { return timestamp; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }
    

    public String getSourcePort() { return sourcePort; }
    public void setSourcePort(String sourcePort) { this.sourcePort = sourcePort; }
    public String getDestPort() {return destPort;}
    public void setDestPort(String destPort) {this.destPort = destPort;}
    
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
}
