#!/bin/bash
# Script to build base image with all dependencies

set -e

echo "Building audio-processor-base image..."
VERSION=${1:-1.0}

echo "Building base version $VERSION..."
sudo nerdctl --namespace k8s.io build --no-cache -f Dockerfile.base -t local.registry/audio-processor-base:$VERSION .

echo ""
echo "✅ Base image local.registry/audio-processor-base:$VERSION built successfully!"
echo ""
echo "Now you can build the app image with:"
echo "  bash build.sh 1.0"
