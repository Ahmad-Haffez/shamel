# WiFi Traffic Kafka Producer

Standalone Python application that captures WiFi traffic using tshark and sends to Kafka.

## Prerequisites

### System Requirements
- Linux/macOS with WiFi interface
- Root/sudo access for packet capture
- Python 3.7+
- Wireshark/tshark installed
- Kafka broker accessible

### Install Dependencies

```bash
# Install tshark (Wireshark command-line)
sudo apt-get update
sudo apt-get install tshark

# Install Python Kafka library
pip install kafka-python

# Or using requirements.txt
pip install -r requirements.txt
```

### Allow Non-Root Packet Capture (Optional)
```bash
# Add your user to wireshark group
sudo usermod -a -G wireshark $USER

# Set capabilities on tshark
sudo setcap cap_net_raw,cap_net_admin=eip /usr/bin/tshark

# Log out and back in for group changes to take effect
```

## Configuration

Edit `wifi_kafka_producer.py` to configure:

```python
# Kafka broker address
KAFKA_BROKER = 'localhost:9092'  # Change to your Kafka broker

# Kafka topic name
TOPIC = 'wifi_traffic'
```

For Minikube Kafka access from host:
```bash
# Port-forward Kafka broker
kubectl port-forward -n kafka svc/my-cluster-kafka-bootstrap 9092:9092

# Use localhost:9092 in the script
```

## Usage

### Option 1: Using the Wrapper Script (Recommended)

```bash
cd /home/z/Desktop/shamel/POCchart/wifi-producer

# Make script executable
chmod +x capture_wifi.sh

# Run with sudo
sudo ./capture_wifi.sh
```

### Option 2: Manual Command

```bash
# Capture from wlo1 interface and pipe to producer
sudo tshark -i wlo1 -T json -l | python3 wifi_kafka_producer.py
```

### Option 3: Different Interface

```bash
# List available interfaces
ip link show

# Capture from specific interface (e.g., wlan0)
sudo tshark -i wlan0 -T json -l | python3 wifi_kafka_producer.py
```

## Output

The producer will display:
```
============================================================
WiFi Traffic Kafka Producer
============================================================
Kafka Broker: localhost:9092
Kafka Topic: wifi_traffic
Waiting for tshark input from stdin...
============================================================
✓ Connected to Kafka broker: localhost:9092
📦 Sent 100 packets to Kafka
📦 Sent 200 packets to Kafka
...
```

## Data Format

Each packet is sent to Kafka as JSON:

```json
{
  "timestamp": "2025-12-06T10:30:45.123456",
  "captureTime": "Dec 06, 2025 10:30:45.123456000 UTC",
  "frameNumber": "42",
  "frameLen": 1420,
  "protocols": "eth:ethertype:ip:tcp:tls",
  "sourceMAC": "aa:bb:cc:dd:ee:ff",
  "destMAC": "11:22:33:44:55:66",
  "sourceIP": "192.168.1.100",
  "destIP": "8.8.8.8",
  "ipProto": "6",
  "tcpSrcPort": "54321",
  "tcpDstPort": "443",
  "udpSrcPort": null,
  "udpDstPort": null,
  "info": ""
}
```

## Kafka Topic Setup

Create the topic in Kafka:

```bash
# Using Minikube
kubectl exec -it my-cluster-kafka-0 -n kafka -- bin/kafka-topics.sh \
  --create \
  --topic wifi_traffic \
  --partitions 10 \
  --replication-factor 1 \
  --bootstrap-server localhost:9092

# Verify topic
kubectl exec -it my-cluster-kafka-0 -n kafka -- bin/kafka-topics.sh \
  --list \
  --bootstrap-server localhost:9092
```

## Consuming the Data

### Test with Kafka Console Consumer

```bash
# Using Minikube
kubectl exec -it my-cluster-kafka-0 -n kafka -- bin/kafka-console-consumer.sh \
  --topic wifi_traffic \
  --from-beginning \
  --bootstrap-server localhost:9092
```

### Integrate with Flink

Use the SQL table definition in `../sql-job/wifi_analysis.sql`:

```sql
CREATE TABLE wifi_traffic (
    `timestamp` STRING,
    captureTime STRING,
    frameNumber STRING,
    frameLen INT,
    protocols STRING,
    sourceIP STRING,
    destIP STRING,
    tcpSrcPort INT,
    tcpDstPort INT,
    ...
) WITH (
    'connector' = 'kafka',
    'topic' = 'wifi_traffic',
    'properties.bootstrap.servers' = 'my-cluster-kafka-bootstrap.kafka.svc.cluster.local:9092',
    'format' = 'json'
);
```

## Troubleshooting

### Permission Denied
```bash
# Run with sudo
sudo tshark -i wlo1 -T json -l | python3 wifi_kafka_producer.py

# Or fix permissions (see "Allow Non-Root" section above)
```

### Interface Not Found
```bash
# List all network interfaces
ip link show

# Or use tshark to list
tshark -D

# Update INTERFACE in capture_wifi.sh or use different interface name
```

### Kafka Connection Failed
```bash
# Check if Kafka is accessible
telnet localhost 9092

# For Minikube, ensure port-forward is running
kubectl port-forward -n kafka svc/my-cluster-kafka-bootstrap 9092:9092

# Or update KAFKA_BROKER in wifi_kafka_producer.py to your Kafka address
```

### No Packets Captured
```bash
# Check if interface is up
sudo ip link set wlo1 up

# Verify packets are flowing
sudo tshark -i wlo1 -c 10

# Check if WiFi is connected
iwconfig wlo1
```

## Stopping the Capture

Press `Ctrl+C` to stop. The producer will:
1. Stop reading packets
2. Flush remaining packets to Kafka
3. Display summary statistics
4. Close Kafka connection cleanly

## Performance

- **Throughput**: ~1,000-5,000 packets/second (depending on WiFi traffic)
- **Latency**: Near real-time (<100ms)
- **Memory**: ~50-100 MB
- **CPU**: ~5-10% per core

## Security & Privacy

⚠️ **Warning**: Capturing network traffic may have legal and privacy implications.

- Only capture on networks you own or have permission to monitor
- Be aware of local laws regarding packet capture
- Captured data may contain sensitive information
- Consider encrypting data in transit to Kafka
- Implement access controls on Kafka topic

## Files

```
wifi-producer/
├── wifi_kafka_producer.py  # Main Python producer
├── capture_wifi.sh          # Wrapper script
├── requirements.txt         # Python dependencies
└── README.md                # This file
```
