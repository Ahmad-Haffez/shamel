package com.shamel.flink;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.Arrays;
import java.util.List;

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
import org.apache.flink.streaming.api.windowing.assigners.SlidingProcessingTimeWindows;
import org.apache.flink.streaming.api.windowing.time.Time;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class WifiAggregator {
    private static final Logger LOG = LoggerFactory.getLogger(WifiAggregator.class);
    
    public static void main(String[] args) throws Exception {
        // Get Kafka broker from environment or use default
        String kafkaBroker = System.getenv().getOrDefault("KAFKA_BROKER", "my-cluster-kafka-bootstrap.kafka.svc:9092");
        
        // Get ClickHouse connection from environment
        String clickHouseHost = System.getenv().getOrDefault("CLICKHOUSE_HOST", "clickhouse.default.svc");
        int clickHousePort = Integer.parseInt(System.getenv().getOrDefault("CLICKHOUSE_PORT", "8123"));
        
        LOG.info("Starting WiFi Aggregator with Kafka broker: {}", kafkaBroker);
        LOG.info("ClickHouse: {}:{}", clickHouseHost, clickHousePort);
        
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
        

        
        //     Skip mDNS and DNS packets
            //protocols = frame.get('frame_frame_protocols', '')
            List<String> excludedProtocols = Arrays.asList(
                "eth:ethertype:ip:udp:mdns",
                "eth:ethertype:ip:udp:dns",
                "eth:ethertype:ip:udp:dhcp",
                "eth:ethertype:ip:icmp",

                "eth:ethertype:ipv6:udp:dhcpv6",
                "eth:ethertype:ipv6:udp:mdns",
                "eth:ethertype:ipv6:icmpv6",
                "eth:ethertype:ipv6:ipv6.hopopts:icmpv6",

                "eth:ethertype:arp"
            );
            
            
            
        // Filter out unknown subscribers and excluded protocols
        DataStream<EnrichedPacket> remainingTraffic = enrichedPackets
                // .filter(packet -> !"unknown".equals(packet.getSubscriberName()))
                .filter(packet -> !excludedProtocols.contains(packet.getProtocol()));
        
        // Aggregate by subscriber and protocol (60-second tumbling window)
        DataStream<SubscriberProtocolStats> subscriberStats = remainingTraffic
                .keyBy(
                    packet -> new Tuple2<>(packet.getSubscriberName(), packet.getSecondPartyName()),
                    TypeInformation.of(new TypeHint<Tuple2<String, String>>() {})
                )
                .window(TumblingProcessingTimeWindows.of(Time.seconds(60)))
                .aggregate(new SubscriberProtocolAggregator())
                .name("Per-Subscriber Aggregation");
        
        // Aggregate globally by protocol (60-second tumbling window)
        DataStream<GlobalProtocolStats> globalStats = remainingTraffic
                .keyBy(packet->packet.getSecondPartyName())
                .window(SlidingProcessingTimeWindows.of(Time.seconds(600), Time.seconds(30)))
                .aggregate(new GlobalProtocolAggregator())
                .name("Global Protocol Aggregation");
        
        // Write results to ClickHouse
        subscriberStats.addSink(new ClickHouseSubscriberSink(clickHouseHost, clickHousePort))
                .name("ClickHouse Subscriber Sink");
        globalStats.addSink(new ClickHouseGlobalSink(clickHouseHost, clickHousePort))
                .name("ClickHouse Global Sink");
        
        // Anomaly Detection Pipeline
        DataStream<TrafficAnomaly> anomalies = subscriberStats
                .keyBy(stats -> stats.getSubscriberName() + "-" + stats.getSecondParty())
                .process(new AnomalyDetector())
                .name("Anomaly Detection");
        
        // Write anomalies to ClickHouse
        anomalies.addSink(new ClickHouseAnomalySink(clickHouseHost, clickHousePort))
                .name("ClickHouse Anomaly Sink");
        
        // Also print anomalies for monitoring
        anomalies.print("ANOMALY_DETECTED");
        
        // Execute
        env.execute("WiFi Traffic Aggregator with Anomaly Detection");
    }
}
