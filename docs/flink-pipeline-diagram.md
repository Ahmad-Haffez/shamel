# WiFi Traffic Analytics - Flink Pipeline Architecture

## Overview
Real-time WiFi traffic analytics pipeline using Apache Flink for stream processing, Kafka for data ingestion, and ClickHouse for analytics storage.

## Pipeline Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DATA INGESTION LAYER                                │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
                        ┌───────────────────────────┐
                        │   WiFi Producer (CronJob) │
                        │                           │
                        │  • Captures network       │
                        │    packets with tshark    │
                        │  • Extracts metadata:     │
                        │    - MAC addresses        │
                        │    - IP addresses         │
                        │    - Protocols            │
                        │    - Frame length         │
                        │    - Ports               │
                        └───────────┬───────────────┘
                                    │
                                    ▼
                        ┌───────────────────────────┐
                        │   Kafka Topic             │
                        │   (wifi_traffic)          │
                        │                           │
                        │  • Topic: wifi_traffic    │
                        │  • Partitions: 1          │
                        │  • JSON messages          │
                        └───────────┬───────────────┘
                                    │
┌───────────────────────────────────┴───────────────────────────────────────────┐
│                         STREAM PROCESSING LAYER (FLINK)                        │
└────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                        ┌───────────────────────────┐
                        │   Kafka Source            │
                        │   (KafkaSource)           │
                        │                           │
                        │  • Consumer Group:        │
                        │    wifi-aggregator-group  │
                        │  • Starting Offset: 0     │
                        │  • Parallelism: 2         │
                        └───────────┬───────────────┘
                                    │
                                    ▼
                        ┌───────────────────────────┐
                        │   Parse & Map             │
                        │                           │
                        │  • Parse JSON             │
                        │  • Extract fields         │
                        │  • Create WifiPacket      │
                        └───────────┬───────────────┘
                                    │
                                    ▼
                        ┌───────────────────────────┐
                        │   Filter Invalid          │
                        │                           │
                        │  • sourceMAC != null      │
                        │  • destMAC != null        │
                        │  • frameLen > 0           │
                        └───────────┬───────────────┘
                                    │
                    ┌───────────────┴────────────────────┐
                    │                                     │
                    ▼                                     ▼
    ┌───────────────────────────┐         ┌──────────────────────────────┐
    │ Subscriber Enrichment     │         │  Global Aggregation          │
    │                           │         │                              │
    │ • Add subscriber lookup   │         │  • Key by: destMAC          │
    │ • Key by: sourceMAC +     │         │  • Window: 1 minute tumble  │
    │           destMAC          │         │  • Aggregate:               │
    │ • Window: 1 minute tumble │         │    - count packets          │
    │ • Aggregate:              │         │    - sum bytes              │
    │   - count packets         │         │                              │
    │   - sum bytes             │         └──────────┬───────────────────┘
    │   - track connections     │                    │
    └──────────┬────────────────┘                    │
               │                                     │
               ▼                                     │
    ┌───────────────────────────┐                   │
    │ Filter Valid Subscribers  │                   │
    │                           │                   │
    │ • bytes > 0               │                   │
    └──────────┬────────────────┘                   │
               │                                     │
               ▼                                     │
    ┌───────────────────────────┐                   │
    │ Anomaly Detection         │                   │
    │                           │                   │
    │ • Calculate z-score       │                   │
    │ • Detect:                 │                   │
    │   - HIGH_TRAFFIC          │                   │
    │   - UNUSUAL_PATTERN       │                   │
    │ • Severity levels:        │                   │
    │   - CRITICAL (z > 3.0)    │                   │
    │   - HIGH (z > 2.0)        │                   │
    │   - MEDIUM (z > 1.0)      │                   │
    │   - LOW (z > 0.5)         │                   │
    └──────────┬────────────────┘                   │
               │                                     │
               ▼                                     │
    ┌───────────────────────────┐                   │
    │ Filter Anomalies          │                   │
    │                           │                   │
    │ • anomaly_score > 0.5     │                   │
    └──────────┬────────────────┘                   │
               │                                     │
┌──────────────┴──────────────────────────────┬────┴──────────────┐
│                                              │                    │
▼                                              ▼                    ▼
┌──────────────────────────┐   ┌─────────────────────────┐   ┌────────────────────┐
│ ClickHouse Sink          │   │ ClickHouse Sink         │   │ ClickHouse Sink    │
│ (Subscriber Stats)       │   │ (Traffic Anomalies)     │   │ (Global Stats)     │
│                          │   │                         │   │                    │
│ Table: subscriber_stats  │   │ Table: traffic_anomalies│   │ Table: global_stats│
│                          │   │                         │   │                    │
│ Fields:                  │   │ Fields:                 │   │ Fields:            │
│ • timestamp              │   │ • timestamp             │   │ • timestamp        │
│ • subscriber (MAC)       │   │ • detection_time        │   │ • second_party     │
│ • second_party (MAC)     │   │ • subscriber            │   │ • packets          │
│ • bytes                  │   │ • second_party          │   │ • bytes            │
│ • last_seen              │   │ • anomaly_type          │   │ • last_seen        │
│                          │   │ • severity              │   │                    │
│                          │   │ • anomaly_score         │   │                    │
│                          │   │ • current_value         │   │                    │
│                          │   │ • baseline_value        │   │                    │
│                          │   │ • description           │   │                    │
└──────────┬───────────────┘   └──────────┬──────────────┘   └─────────┬──────────┘
           │                              │                             │
┌──────────┴──────────────────────────────┴─────────────────────────────┴──────────┐
│                            ANALYTICS & STORAGE LAYER                             │
│                                                                                   │
│                          ┌──────────────────────────┐                            │
│                          │      ClickHouse          │                            │
│                          │                          │                            │
│                          │  • Column-oriented DB    │                            │
│                          │  • Real-time analytics   │                            │
│                          │  • SQL queries           │                            │
│                          │  • Aggregations          │                            │
│                          └──────────┬───────────────┘                            │
│                                     │                                             │
└─────────────────────────────────────┼─────────────────────────────────────────────┘
                                      │
┌─────────────────────────────────────┴─────────────────────────────────────────────┐
│                            APPLICATION LAYER                                       │
└────────────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                  │
                    ▼                 ▼                  ▼
        ┌──────────────────┐  ┌─────────────┐  ┌──────────────────┐
        │  WiFi Stats      │  │ AI Agent    │  │ Audio Search     │
        │  Backend API     │  │ (vLLM)      │  │ Service          │
        │                  │  │             │  │                  │
        │ • REST endpoints │  │ • NL-to-SQL │  │ • Multimodal     │
        │ • Query CH       │  │ • Qwen2.5   │  │ • Whisper STT    │
        │ • Aggregations   │  │   1.5B      │  │ • Embeddings     │
        └────────┬─────────┘  └──────┬──────┘  └────────┬─────────┘
                 │                   │                    │
                 └───────────────────┴────────────────────┘
                                     │
                                     ▼
                        ┌────────────────────────────┐
                        │   React Frontend           │
                        │                            │
                        │  • Dashboard               │
                        │  • NL Search               │
                        │  • Audio Search            │
                        │  • Analytics Charts        │
                        │  • Anomaly Alerts          │
                        └────────────────────────────┘
```

## Data Flow Details

### 1. Ingestion Phase
- **WiFi Producer**: CronJob running on wifi-sniffer node
  - Uses `tshark` to capture network packets
  - Produces ~10 packets/second to Kafka
  - JSON format with metadata extraction

### 2. Stream Processing Phase (Flink)
- **Parallelism**: 2 task slots
- **Windowing**: 1-minute tumbling windows
- **Checkpointing**: Every 60 seconds
- **State Backend**: Filesystem (local storage)

### 3. Processing Branches

#### Branch A: Subscriber Analytics
- Groups by (sourceMAC, destMAC) pairs
- Aggregates traffic per subscriber
- Tracks unique destinations
- Outputs to `subscriber_stats` table

#### Branch B: Anomaly Detection
- Calculates statistical baselines
- Computes z-scores for traffic patterns
- Detects outliers and unusual behavior
- Assigns severity levels
- Outputs to `traffic_anomalies` table

#### Branch C: Global Analytics
- Groups by destination MAC only
- Aggregates total traffic per destination
- Tracks packet counts and bytes
- Outputs to `global_stats` table

### 4. Storage Phase (ClickHouse)
- **Database**: Default database
- **Tables**: 3 aggregated tables
- **User**: `flink` (with read/write permissions)
- **Query Latency**: Sub-second for most queries

### 5. Application Phase
- **Backend API**: Node.js/Express serving REST endpoints
- **AI Agent**: vLLM serving Qwen2.5-1.5B for natural language queries
- **Audio Search**: Whisper + SentenceTransformers for multimodal search
- **Frontend**: React SPA with real-time dashboards

## Key Metrics

- **Throughput**: ~10-20 packets/second
- **Latency**: 1-minute window latency
- **Storage**: Time-series data with 24-hour retention queries
- **Anomaly Detection**: Real-time with configurable thresholds

## Technologies

- **Stream Processing**: Apache Flink 1.18
- **Message Queue**: Apache Kafka (Strimzi)
- **Database**: ClickHouse 25.11
- **Container Runtime**: K3s with containerd
- **Language**: Java (Flink), JavaScript (Backend), Python (AI/Audio)
