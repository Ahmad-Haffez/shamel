package com.shamel.flink;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.flink.api.common.functions.RichMapFunction;
import org.apache.flink.configuration.Configuration;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

public class SubscriberEnrichmentFunction extends RichMapFunction<WifiPacket, EnrichedPacket> {
    private transient Map<String, Subscriber> subscribers;
    private transient ObjectMapper objectMapper;

    @Override
    public void open(Configuration parameters) throws Exception {
        super.open(parameters);
        objectMapper = new ObjectMapper();
        subscribers = new HashMap<>();

        // Load subscribers from JSON file
        try (InputStream is = getClass().getClassLoader().getResourceAsStream("subscribers.json")) {
            if (is != null) {
                @SuppressWarnings("unchecked")
                Map<String, Subscriber> loadedSubscribers = objectMapper.readValue(is, 
                    objectMapper.getTypeFactory().constructMapType(HashMap.class, String.class, Subscriber.class));
                subscribers.putAll(loadedSubscribers);
            }
        }
    }

    @Override
    public EnrichedPacket map(WifiPacket packet) {
        EnrichedPacket enriched = new EnrichedPacket();
        
        // Copy basic fields
        enriched.setTimestamp(packet.getTimestamp());
        enriched.setSourceIP(packet.getSourceIP());
        enriched.setDestIP(packet.getDestIP());
        enriched.setSourceHostname(packet.getSourceHostname());
        enriched.setDestHostname(packet.getDestHostname());
        enriched.setSourceMAC(packet.getSourceMAC());
        enriched.setDestMAC(packet.getDestMAC());
        enriched.setProtocol(packet.getProtocol());
        enriched.setLength(packet.getLength());

        // Enrich with subscriber info
        Subscriber sourceSubscriber = subscribers.get(packet.getSourceIP());
        Subscriber destSubscriber = subscribers.get(packet.getDestIP());

        if (sourceSubscriber != null) {
            // Outgoing traffic from subscriber
            enriched.setSubscriberName(sourceSubscriber.getSubscriber());
            enriched.setSubscriberMachine(sourceSubscriber.getMachineId());
            enriched.setSubscriberMAC(sourceSubscriber.getMac());
            if (destSubscriber != null)
            {
                enriched.setTrafficType("internal");
                enriched.setSecondPartyName(destSubscriber.getSubscriber());
            } 
            else
            {
                enriched.setTrafficType("out");
                enriched.setSecondPartyName(packet.getDestHostname());
            }
            
        } else if (destSubscriber != null) {
            // Incoming traffic to subscriber
            enriched.setSubscriberName(destSubscriber.getSubscriber());
            enriched.setSubscriberMachine(destSubscriber.getMachineId());
            enriched.setSubscriberMAC(destSubscriber.getMac());
            enriched.setTrafficType("in");
            enriched.setSecondPartyName(packet.getSourceHostname());
        } else {
            // No subscriber match
            enriched.setSubscriberName("unknown");
            enriched.setSubscriberMachine("unknown");
            enriched.setSubscriberMAC("unknown");
            enriched.setTrafficType("unknown");
            enriched.setSecondPartyName("unknown");
        }

        return enriched;
    }
}
