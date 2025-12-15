#!/bin/bash
# Script to build and import audio-processor image to k3s

set -e

echo "Building audio-processor image..."
VERSION=${1:-1.0}

echo "Building version $VERSION..."
sudo nerdctl --namespace k8s.io build -t local.registry/audio-processor:$VERSION .

echo ""
echo "✅ Image audio-processor:$VERSION built and imported successfully!"
echo ""
echo "To deploy, run:"
echo "  kubectl apply -f audio-processor-deployment.yaml"
