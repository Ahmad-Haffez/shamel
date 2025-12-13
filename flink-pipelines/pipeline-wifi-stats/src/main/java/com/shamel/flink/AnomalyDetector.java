package com.shamel.flink;

import org.apache.flink.api.common.state.ValueState;
import org.apache.flink.api.common.state.ValueStateDescriptor;
import org.apache.flink.configuration.Configuration;
import org.apache.flink.streaming.api.functions.KeyedProcessFunction;
import org.apache.flink.util.Collector;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.List;

public class AnomalyDetector extends KeyedProcessFunction<String, SubscriberProtocolStats, TrafficAnomaly> {
    private static final Logger LOG = LoggerFactory.getLogger(AnomalyDetector.class);
    
    // Thresholds for anomaly detection
    private static final double SPIKE_THRESHOLD = 3.0; // 3x baseline
    private static final double CRITICAL_SPIKE_THRESHOLD = 5.0; // 5x baseline
    private static final long MIN_BASELINE_SAMPLES = 3;
    
    // State to track historical statistics
    private transient ValueState<SubscriberBaseline> baselineState;
    
    @Override
    public void open(Configuration parameters) throws Exception {
        ValueStateDescriptor<SubscriberBaseline> descriptor = 
            new ValueStateDescriptor<>("subscriber-baseline", SubscriberBaseline.class);
        baselineState = getRuntimeContext().getState(descriptor);
    }
    
    @Override
    public void processElement(SubscriberProtocolStats stats, Context ctx, Collector<TrafficAnomaly> out) throws Exception {
        String key = stats.getSubscriberName() + "-" + stats.getSecondParty();
        
        // Get or create baseline
        SubscriberBaseline baseline = baselineState.value();
        if (baseline == null) {
            baseline = new SubscriberBaseline();
        }
        
        List<TrafficAnomaly> anomalies = detectAnomalies(stats, baseline);
        
        // Update baseline with current stats
        baseline.addSample(stats.getTotalBytes(), stats.getPacketCount());
        baselineState.update(baseline);
        
        // Emit anomalies
        for (TrafficAnomaly anomaly : anomalies) {
            out.collect(anomaly);
            LOG.warn("Detected anomaly: {}", anomaly);
        }
    }
    
    private List<TrafficAnomaly> detectAnomalies(SubscriberProtocolStats stats, SubscriberBaseline baseline) {
        List<TrafficAnomaly> anomalies = new ArrayList<>();
        
        if (baseline.getSampleCount() < MIN_BASELINE_SAMPLES) {
            // Not enough data for baseline, skip detection
            return anomalies;
        }
        
        long currentBytes = stats.getTotalBytes();
        double avgBytes = baseline.getAvgBytes();
        double stdDevBytes = baseline.getStdDevBytes();
        
        // Detect traffic spike
        if (avgBytes > 0) {
            double ratio = currentBytes / avgBytes;
            
            if (ratio >= CRITICAL_SPIKE_THRESHOLD) {
                anomalies.add(new TrafficAnomaly(
                    stats.getSubscriberName(),
                    stats.getSecondParty(),
                    "TRAFFIC_SPIKE",
                    "CRITICAL",
                    ratio,
                    currentBytes,
                    avgBytes,
                    String.format("Traffic %.1fx above baseline (%.0f bytes vs %.0f bytes avg)", 
                                ratio, (double)currentBytes, avgBytes)
                ));
            } else if (ratio >= SPIKE_THRESHOLD) {
                anomalies.add(new TrafficAnomaly(
                    stats.getSubscriberName(),
                    stats.getSecondParty(),
                    "TRAFFIC_SPIKE",
                    ratio >= 4.0 ? "HIGH" : "MEDIUM",
                    ratio,
                    currentBytes,
                    avgBytes,
                    String.format("Traffic %.1fx above baseline (%.0f bytes vs %.0f bytes avg)", 
                                ratio, (double)currentBytes, avgBytes)
                ));
            }
        }
        
        // Detect new connection pattern
        if (baseline.getSampleCount() == MIN_BASELINE_SAMPLES && currentBytes > 1000) {
            anomalies.add(new TrafficAnomaly(
                stats.getSubscriberName(),
                stats.getSecondParty(),
                "NEW_CONNECTION",
                "LOW",
                1.0,
                currentBytes,
                0.0,
                String.format("New communication pattern detected: %s -> %s", 
                            stats.getSubscriberName(), stats.getSecondParty())
            ));
        }
        
        // Detect abnormally low traffic (possible connection issue)
        if (avgBytes > 1000 && currentBytes < avgBytes * 0.1) {
            anomalies.add(new TrafficAnomaly(
                stats.getSubscriberName(),
                stats.getSecondParty(),
                "TRAFFIC_DROP",
                "MEDIUM",
                avgBytes / Math.max(currentBytes, 1),
                currentBytes,
                avgBytes,
                String.format("Traffic dropped significantly (%.0f bytes vs %.0f bytes avg)", 
                            (double)currentBytes, avgBytes)
            ));
        }
        
        return anomalies;
    }
    
    // Inner class to maintain baseline statistics
    public static class SubscriberBaseline {
        private List<Long> bytesSamples = new ArrayList<>();
        private List<Long> packetSamples = new ArrayList<>();
        private static final int MAX_SAMPLES = 10;
        
        public void addSample(long bytes, long packets) {
            bytesSamples.add(bytes);
            packetSamples.add(packets);
            
            // Keep only recent samples
            if (bytesSamples.size() > MAX_SAMPLES) {
                bytesSamples.remove(0);
                packetSamples.remove(0);
            }
        }
        
        public int getSampleCount() {
            return bytesSamples.size();
        }
        
        public double getAvgBytes() {
            if (bytesSamples.isEmpty()) return 0.0;
            return bytesSamples.stream().mapToLong(Long::longValue).average().orElse(0.0);
        }
        
        public double getStdDevBytes() {
            if (bytesSamples.size() < 2) return 0.0;
            double avg = getAvgBytes();
            double variance = bytesSamples.stream()
                .mapToDouble(b -> Math.pow(b - avg, 2))
                .average()
                .orElse(0.0);
            return Math.sqrt(variance);
        }
        
        public double getAvgPackets() {
            if (packetSamples.isEmpty()) return 0.0;
            return packetSamples.stream().mapToLong(Long::longValue).average().orElse(0.0);
        }
    }
}
