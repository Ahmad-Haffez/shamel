#!/bin/bash
# Script to build and import wifi-stats-backend image to k3s

set -e

echo "Building wifi-stats-backend image..."
# cd ~/POCchart/wifi-stats-backend

# Get version from user or use default
VERSION=${1:-1.2}

echo "Building version $VERSION..."
sudo nerdctl --namespace k8s.io build --no-cache -t wifi-stats-backend:$VERSION .

echo "Saving and importing to k3s..."
sudo nerdctl --namespace k8s.io save wifi-stats-backend:$VERSION | sudo k3s ctr images import -

echo ""
echo "✅ Image wifi-stats-backend:$VERSION built and imported successfully!"
echo ""
echo "To deploy, run on your local machine:"
echo "  kubectl delete pods -l app=wifi-stats-backend"
