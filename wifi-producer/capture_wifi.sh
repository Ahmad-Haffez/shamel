#!/bin/bash
# WiFi Packet Capture and Send to Kafka
# Usage: sudo ./capture_wifi.sh

INTERFACE="wlp1s0"
KAFKA_SCRIPT="./wifi_kafka_producer.py"
VENV_PATH="./venv"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "WiFi Traffic Capture to Kafka$"
echo -e "${GREEN}========================================${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}✗ Please run as root (sudo)${NC}"
    exit 1
fi

# Check if tshark is installed
if ! command -v tshark &> /dev/null; then
    echo -e "${RED}✗ tshark not found${NC}"
    echo -e "${YELLOW}Install with: sudo apt-get install tshark${NC}"
    exit 1
fi

# Check if Python script exists
if [ ! -f "$KAFKA_SCRIPT" ]; then
    echo -e "${RED}✗ Kafka producer script not found: $KAFKA_SCRIPT${NC}"
    exit 1
fi

# Check if venv exists
if [ ! -d "$VENV_PATH" ]; then
    echo -e "${RED}✗ Virtual environment not found: $VENV_PATH${NC}"
    echo -e "${YELLOW}Create with: python3 -m venv venv && source venv/bin/activate && pip install kafka-python${NC}"
    exit 1
fi

# Get Python from venv
PYTHON_BIN="$VENV_PATH/bin/python3"
if [ ! -f "$PYTHON_BIN" ]; then
    echo -e "${RED}✗ Python not found in venv: $PYTHON_BIN${NC}"
    exit 1
fi

# Check if interface exists
if ! ip link show "$INTERFACE" &> /dev/null; then
    echo -e "${RED}✗ Interface $INTERFACE not found${NC}"
    echo -e "${YELLOW}Available interfaces:${NC}"
    ip link show | grep -E '^[0-9]+:' | awk '{print $2}' | sed 's/:$//'
    exit 1
fi

echo -e "${GREEN}✓ Interface: $INTERFACE${NC}"
echo -e "${GREEN}✓ Kafka Producer: $KAFKA_SCRIPT${NC}"
echo ""
echo -e "${YELLOW}Starting packet capture...${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
echo ""

# Test tshark can access interface first
if ! tshark -i "$INTERFACE" -c 1 &>/dev/null; then
    echo -e "${RED}✗ Cannot capture on $INTERFACE${NC}"
    echo -e "${YELLOW}Try: sudo tshark -D  (to list interfaces)${NC}"
    exit 1
fi
echo "tshark2"
# Capture WiFi traffic and pipe to Python Kafka producer
sudo tshark -i "$INTERFACE" \
    -T json \
    -l \
    2>/dev/null | \
    "$PYTHON_BIN" "$KAFKA_SCRIPT"

echo -e "${GREEN}Capture stopped${NC}"
