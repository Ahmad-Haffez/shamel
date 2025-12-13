package com.shamel.flink;

import java.io.Serializable;

public class TrafficAnomaly implements Serializable {
    private String timestamp;
    private String subscriber;
    private String secondParty;
    private String anomalyType;
    private String severity; // LOW, MEDIUM, HIGH, CRITICAL
    private double anomalyScore;
    private long currentValue;
    private double baselineValue;
    private String description;
    
    public TrafficAnomaly() {}
    
    public TrafficAnomaly(String subscriber, String secondParty, String anomalyType, 
                         String severity, double anomalyScore, long currentValue, 
                         double baselineValue, String description) {
        this.timestamp = String.valueOf(System.currentTimeMillis());
        this.subscriber = subscriber;
        this.secondParty = secondParty;
        this.anomalyType = anomalyType;
        this.severity = severity;
        this.anomalyScore = anomalyScore;
        this.currentValue = currentValue;
        this.baselineValue = baselineValue;
        this.description = description;
    }
    
    // Getters and setters
    public String getTimestamp() { return timestamp; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }
    
    public String getSubscriber() { return subscriber; }
    public void setSubscriber(String subscriber) { this.subscriber = subscriber; }
    
    public String getSecondParty() { return secondParty; }
    public void setSecondParty(String secondParty) { this.secondParty = secondParty; }
    
    public String getAnomalyType() { return anomalyType; }
    public void setAnomalyType(String anomalyType) { this.anomalyType = anomalyType; }
    
    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }
    
    public double getAnomalyScore() { return anomalyScore; }
    public void setAnomalyScore(double anomalyScore) { this.anomalyScore = anomalyScore; }
    
    public long getCurrentValue() { return currentValue; }
    public void setCurrentValue(long currentValue) { this.currentValue = currentValue; }
    
    public double getBaselineValue() { return baselineValue; }
    public void setBaselineValue(double baselineValue) { this.baselineValue = baselineValue; }
    
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    
    @Override
    public String toString() {
        return String.format("ANOMALY[%s] %s: %s->%s | %s (score: %.2f, current: %d, baseline: %.1f) - %s",
            severity, anomalyType, subscriber, secondParty, description, 
            anomalyScore, currentValue, baselineValue, timestamp);
    }
}
