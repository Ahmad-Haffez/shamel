#!/bin/bash
# Script to build and import audio-processor image to k3s

set -e

echo "Building audio-processor image..."
VERSION=${1:-1.0}

echo "Building version $VERSION..."
docker build -t audio-processor:$VERSION .

echo "Saving and importing to k3s..."
docker save audio-processor:$VERSION | sudo k3s ctr images import -

echo ""
echo "✅ Image audio-processor:$VERSION built and imported successfully!"
echo ""
echo "To deploy, run:"
echo "  kubectl apply -f audio-processor-deployment.yaml"
