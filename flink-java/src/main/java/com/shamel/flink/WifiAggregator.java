package com.shamel.flink;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.flink.api.common.eventtime.WatermarkStrategy;
import org.apache.flink.api.common.serialization.SimpleStringSchema;
import org.apache.flink.api.common.typeinfo.TypeHint;
import org.apache.flink.api.common.typeinfo.TypeInformation;
import org.apache.flink.api.java.tuple.Tuple2;
import org.apache.flink.connector.kafka.source.KafkaSource;
import org.apache.flink.connector.kafka.source.enumerator.initializer.OffsetsInitializer;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.windowing.assigners.TumblingProcessingTimeWindows;
import org.apache.flink.streaming.api.windowing.time.Time;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class WifiAggregator {
    private static final Logger LOG = LoggerFactory.getLogger(WifiAggregator.class);
    
    public static void main(String[] args) throws Exception {
        // Get Kafka broker from environment or use default
        String kafkaBroker = System.getenv().getOrDefault("KAFKA_BROKER", "my-cluster-kafka-bootstrap.kafka.svc:9092");
        
        LOG.info("Starting WiFi Aggregator with Kafka broker: {}", kafkaBroker);
        
        // Set up streaming environment
        final StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
        env.enableCheckpointing(60000); // Checkpoint every 60 seconds
        
        // Configure Kafka source
        KafkaSource<String> source = KafkaSource.<String>builder()
                .setBootstrapServers(kafkaBroker)
                .setTopics("wifi_traffic")
                .setGroupId("wifi-aggregator-group")
                .setStartingOffsets(OffsetsInitializer.latest())
                .setValueOnlyDeserializer(new SimpleStringSchema())
                .build();
        
        // Read from Kafka
        DataStream<String> kafkaStream = env.fromSource(source, WatermarkStrategy.noWatermarks(), "Kafka Source");
        
        // Parse JSON to WifiPacket
        ObjectMapper objectMapper = new ObjectMapper();
        DataStream<WifiPacket> packets = kafkaStream
                .map(json -> {
                    try {
                        return objectMapper.readValue(json, WifiPacket.class);
                    } catch (Exception e) {
                        LOG.error("Failed to parse packet: {}", json, e);
                        return null;
                    }
                })
                .filter(packet -> packet != null);
        
        // Enrich with subscriber information
        DataStream<EnrichedPacket> enrichedPackets = packets
                .map(new SubscriberEnrichmentFunction())
                .name("Subscriber Enrichment");
        
        // Filter out unknown subscribers for aggregation
        DataStream<EnrichedPacket> knownSubscribers = enrichedPackets
                .filter(packet -> !"unknown".equals(packet.getSubscriberName()));
        
        // Aggregate by subscriber and protocol (60-second tumbling window)
        DataStream<SubscriberProtocolStats> subscriberStats = knownSubscribers
                .keyBy(
                    packet -> new Tuple2<>(packet.getSubscriberName(), packet.getProtocol()),
                    TypeInformation.of(new TypeHint<Tuple2<String, String>>() {})
                )
                .window(TumblingProcessingTimeWindows.of(Time.seconds(60)))
                .aggregate(new SubscriberProtocolAggregator())
                .name("Per-Subscriber Aggregation");
        
        // Aggregate globally by protocol (60-second tumbling window)
        DataStream<GlobalProtocolStats> globalStats = enrichedPackets
                .keyBy(EnrichedPacket::getProtocol)
                .window(TumblingProcessingTimeWindows.of(Time.seconds(60)))
                .aggregate(new GlobalProtocolAggregator())
                .name("Global Protocol Aggregation");
        
        // Print results (in production, write to Kafka topics)
        subscriberStats.print("PER_SUBSCRIBER");
        globalStats.print("GLOBAL");
        
        // Execute
        env.execute("WiFi Traffic Aggregator");
    }
}
