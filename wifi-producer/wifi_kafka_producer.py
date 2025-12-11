#!/usr/bin/env python3
"""
WiFi Traffic Capture Producer
Reads tshark output from stdin and sends to Kafka
"""

import json
import sys
from datetime import datetime
from kafka import KafkaProducer

# Kafka configuration
KAFKA_BROKER = 'localhost:9092'  # Change to your Kafka broker
TOPIC = 'wifi_traffic'

def create_producer():
    """Initialize Kafka producer"""
    try:
        producer = KafkaProducer(
            bootstrap_servers=KAFKA_BROKER,
            value_serializer=lambda v: json.dumps(v).encode('utf-8'),
            acks='all',
            retries=3,
            max_in_flight_requests_per_connection=5
        )
        print(f"✓ Connected to Kafka broker: {KAFKA_BROKER}", file=sys.stderr)
        return producer
    except Exception as e:
        print(f"✗ Failed to connect to Kafka: {e}", file=sys.stderr)
        sys.exit(1)

def parse_tshark_json(line):
    """Parse tshark JSON output line"""
    try:
        data = json.loads(line)
        
        # Extract layers
        layers = data.get('_source', {}).get('layers', {})
        
        # Build packet record
        packet = {
            'timestamp': datetime.utcnow().isoformat(),
            'captureTime': layers.get('frame', {}).get('frame.time', ''),
            'frameNumber': layers.get('frame', {}).get('frame.number', ''),
            'frameLen': int(layers.get('frame', {}).get('frame.len', 0)),
            'protocols': layers.get('frame', {}).get('frame.protocols', ''),
            'sourceMAC': layers.get('eth', {}).get('eth.src', ''),
            'destMAC': layers.get('eth', {}).get('eth.dst', ''),
            'sourceIP': layers.get('ip', {}).get('ip.src', ''),
            'destIP': layers.get('ip', {}).get('ip.dst', ''),
            'ipProto': layers.get('ip', {}).get('ip.proto', ''),
            'tcpSrcPort': layers.get('tcp', {}).get('tcp.srcport', None),
            'tcpDstPort': layers.get('tcp', {}).get('tcp.dstport', None),
            'udpSrcPort': layers.get('udp', {}).get('udp.srcport', None),
            'udpDstPort': layers.get('udp', {}).get('udp.dstport', None),
            'info': data.get('_source', {}).get('layers', {}).get('frame', {}).get('frame.comment', '')
        }
        
        return packet
        
    except json.JSONDecodeError:
        return None
    except Exception as e:
        print(f"Error parsing packet: {e}", file=sys.stderr)
        return None

def main():
    """Main producer loop"""
    print("=" * 60, file=sys.stderr)
    print("WiFi Traffic Kafka Producer", file=sys.stderr)
    print("=" * 60, file=sys.stderr)
    print(f"Kafka Broker: {KAFKA_BROKER}", file=sys.stderr)
    print(f"Kafka Topic: {TOPIC}", file=sys.stderr)
    print("Waiting for tshark input from stdin...", file=sys.stderr)
    print("=" * 60, file=sys.stderr)
    
    producer = create_producer()
    packet_count = 0
    error_count = 0
    
    try:
        # Read from stdin (tshark output piped in)
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            
            # Parse packet
            packet = parse_tshark_json(line)
            
            if packet:
                # Send to Kafka
                try:
                    producer.send(TOPIC, packet)
                    packet_count += 1
                    
                    # Progress update every 100 packets
                    if packet_count % 100 == 0:
                        print(f"📦 Sent {packet_count} packets to Kafka", file=sys.stderr)
                        producer.flush()
                        
                except Exception as e:
                    error_count += 1
                    print(f"✗ Error sending packet {packet_count}: {e}", file=sys.stderr)
            else:
                error_count += 1
                
    except KeyboardInterrupt:
        print(f"\n⚠ Interrupted by user", file=sys.stderr)
        
    except Exception as e:
        print(f"✗ Error reading input: {e}", file=sys.stderr)
        
    finally:
        # Cleanup
        print(f"\n{'=' * 60}", file=sys.stderr)
        print(f"📊 Summary:", file=sys.stderr)
        print(f"   Total packets sent: {packet_count}", file=sys.stderr)
        print(f"   Errors: {error_count}", file=sys.stderr)
        print(f"{'=' * 60}", file=sys.stderr)
        
        producer.flush()
        producer.close()
        print("✓ Producer closed", file=sys.stderr)

if __name__ == "__main__":
    main()
