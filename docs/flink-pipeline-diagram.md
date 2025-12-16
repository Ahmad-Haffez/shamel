# WiFi Traffic Analytics - Flink Pipeline Architecture

## Overview
Real-time WiFi traffic analytics pipeline using Apache Flink for stream processing, Kafka for data ingestion, and ClickHouse for analytics storage.

## Pipeline Diagram

```mermaid
graph TB
    subgraph INGESTION["DATA INGESTION LAYER"]
        Producer["WiFi Producer (CronJob)<br/>• Captures packets with tshark<br/>• Extracts: MAC, IP, protocols<br/>• Frame length, ports"]
        Kafka["Kafka Topic (wifi_traffic)<br/>• Partitions: 1<br/>• JSON messages"]
        Producer --> Kafka
    end

    subgraph FLINK["STREAM PROCESSING LAYER (Apache Flink)"]
        Source["Kafka Source<br/>• Group: wifi-aggregator-group<br/>• Parallelism: 2"]
        Parse["Parse & Map<br/>• Parse JSON<br/>• Extract fields<br/>• Create WifiPacket"]
        Filter["Filter Invalid<br/>• sourceMAC != null<br/>• destMAC != null<br/>• frameLen > 0"]
        
        Kafka --> Source
        Source --> Parse
        Parse --> Filter
        
        subgraph Branch1["Subscriber Analytics Branch"]
            SubEnrich["Subscriber Enrichment<br/>• Key: sourceMAC + destMAC<br/>• Window: 1-min tumble<br/>• Aggregate packets & bytes"]
            SubFilter["Filter Valid<br/>• bytes > 0"]
            Anomaly["Anomaly Detection<br/>• Calculate z-score<br/>• HIGH_TRAFFIC detection<br/>• Severity: CRITICAL/HIGH/MEDIUM/LOW"]
            AnoFilter["Filter Anomalies<br/>• score > 0.5"]
            
            Filter --> SubEnrich
            SubEnrich --> SubFilter
            SubFilter --> Anomaly
            Anomaly --> AnoFilter
        end
        
        subgraph Branch2["Global Analytics Branch"]
            GlobalAgg["Global Aggregation<br/>• Key: destMAC<br/>• Window: 1-min tumble<br/>• Count packets & sum bytes"]
            
            Filter --> GlobalAgg
        end
    end

    subgraph STORAGE["ANALYTICS & STORAGE LAYER"]
        SubSink["ClickHouse: subscriber_stats<br/>• timestamp, subscriber<br/>• second_party, bytes<br/>• last_seen"]
        AnoSink["ClickHouse: traffic_anomalies<br/>• timestamp, detection_time<br/>• anomaly_type, severity<br/>• anomaly_score, values"]
        GlobalSink["ClickHouse: global_stats<br/>• timestamp, second_party<br/>• packets, bytes<br/>• last_seen"]
        CH[("ClickHouse Database<br/>• Column-oriented<br/>• Real-time analytics<br/>• SQL queries")]
        
        SubFilter --> SubSink
        AnoFilter --> AnoSink
        GlobalAgg --> GlobalSink
        
        SubSink --> CH
        AnoSink --> CH
        GlobalSink --> CH
    end

    subgraph APP["APPLICATION LAYER"]
        Backend["WiFi Stats Backend API<br/>• REST endpoints<br/>• Query ClickHouse<br/>• Aggregations"]
        AI["AI Agent (vLLM)<br/>• NL-to-SQL<br/>• Qwen2.5-1.5B"]
        Audio["Audio Search Service<br/>• Multimodal search<br/>• Whisper STT<br/>• Embeddings"]
        Frontend["React Frontend<br/>• Dashboard<br/>• NL Search<br/>• Audio Search<br/>• Analytics Charts"]
        
        CH --> Backend
        CH --> AI
        Backend --> Frontend
        AI --> Frontend
        Audio --> Frontend
    end

    classDef ingestion fill:#e1f5ff,stroke:#01579b,stroke-width:2px
    classDef processing fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef storage fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef app fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    
    class Producer,Kafka ingestion
    class Source,Parse,Filter,SubEnrich,SubFilter,Anomaly,AnoFilter,GlobalAgg processing
    class SubSink,AnoSink,GlobalSink,CH storage
    class Backend,AI,Audio,Frontend app
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
