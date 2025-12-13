#!/bin/bash
# K3s Control Plane Setup
# Run this on Node 1 (192.168.100.177)

set -e

echo "=========================================="
echo "K3s Control Plane Installation"
echo "Node: shamel (192.168.100.177)"
echo "=========================================="
echo ""

# Update system
echo "Updating system packages..."
sudo apt-get update

# Install K3s server (control plane + worker)
echo "Installing K3s server..."
curl -sfL https://get.k3s.io | sh -s - server \
  --disable traefik \
  --disable servicelb \
  --write-kubeconfig-mode 644 \
  --node-name shamel \
  --tls-san 192.168.100.177

echo ""
echo "Waiting for K3s to start..."
sleep 10

# Check K3s status
sudo systemctl status k3s --no-pager

echo ""
echo "=========================================="
echo "K3s Installation Complete!"
echo "=========================================="
echo ""

# Display node token
echo "Node Token (save this for worker nodes):"
echo "----------------------------------------"
sudo cat /var/lib/rancher/k3s/server/node-token
echo ""
echo "----------------------------------------"
echo ""

# Display kubeconfig
echo "Kubeconfig location: /etc/rancher/k3s/k3s.yaml"
echo ""
echo "To use kubectl from this machine:"
echo "  export KUBECONFIG=/etc/rancher/k3s/k3s.yaml"
echo "  kubectl get nodes"
echo ""

# Set up kubectl access
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

echo "Verifying cluster..."
kubectl get nodes -o wide

echo ""
echo "=========================================="
echo "Next Steps:"
echo "=========================================="
echo "1. Copy the node token shown above"
echo "2. Run the worker setup script on Node 2"
echo "3. Use the token when prompted"
echo ""
echo "To copy kubeconfig to your local machine:"
echo "  scp root@192.168.100.177:/etc/rancher/k3s/k3s.yaml ~/.kube/k3s-config"
echo "  sed -i 's/127.0.0.1/192.168.100.177/g' ~/.kube/k3s-config"
echo "  export KUBECONFIG=~/.kube/k3s-config"
echo ""
