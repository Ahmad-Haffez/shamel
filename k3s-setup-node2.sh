#!/bin/bash
# K3s Worker Node Setup
# Run this on Node 2 (WiFi capture node)

set -e

echo "=========================================="
echo "K3s Worker WiFi Capture Node Installation"
echo "=========================================="
echo ""

NODE_NAME="ai-worker"
SERVER_IP="192.168.100.177"

NODE_TOKEN="K10db84d3ec4aa34ec09c86e159278da3cbbda41b19e9084d05c320ef3561fd132b::server:0c92fe87d5d5908ed18965f6429af045"
# Update system
echo "Updating system packages..."
sudo apt-get update

# Install K3s agent (worker)
echo "Installing K3s node..."
curl -sfL https://get.k3s.io | K3S_URL=https://${SERVER_IP}:6443 \
  K3S_TOKEN=${NODE_TOKEN} \
  sh -s - agent \
  --node-name ${NODE_NAME}

echo ""
echo "Waiting for K3s agent to start..."
sleep 15

# Check K3s agent status
echo "Checking k3s-agent service..."
if sudo systemctl is-active --quiet k3s-agent; then
    echo "✓ K3s agent is running"
    sudo systemctl status k3s-agent --no-pager
else
    echo "⚠ K3s agent status:"
    sudo systemctl status k3s-agent --no-pager || true
    echo ""
    echo "Checking k3s service (fallback)..."
    sudo systemctl status k3s --no-pager || true
fi

echo ""
echo "=========================================="
echo "K3s Worker Node Installation Complete!"
echo "=========================================="
echo ""
echo "Node: ${NODE_NAME}"
echo "Connected to: ${SERVER_IP}:6443"
echo ""
echo "Verify from control plane node:"
echo "  kubectl get nodes"
echo ""
