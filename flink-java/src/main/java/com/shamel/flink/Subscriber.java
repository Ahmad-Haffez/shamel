package com.shamel.flink;

import com.fasterxml.jackson.annotation.JsonProperty;

public class Subscriber {
    @JsonProperty("subscriber")
    private String subscriber;
    
    @JsonProperty("machineId")
    private String machineId;
    
    @JsonProperty("mac")
    private String mac;

    // Getters and setters
    public String getSubscriber() { return subscriber; }
    public void setSubscriber(String subscriber) { this.subscriber = subscriber; }
    
    public String getMachineId() { return machineId; }
    public void setMachineId(String machineId) { this.machineId = machineId; }
    
    public String getMac() { return mac; }
    public void setMac(String mac) { this.mac = mac; }
}
