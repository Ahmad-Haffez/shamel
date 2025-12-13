#!/bin/bash
set -e

VERSION=${1:-1.0}
IMAGE_NAME="wifi-stats-ai-agent"
FULL_IMAGE="docker.io/library/${IMAGE_NAME}:${VERSION}"

echo "Building AI Agent image: ${FULL_IMAGE}"


# Build with nerdctl in k8s.io namespace
sudo nerdctl -n k8s.io build -t "${FULL_IMAGE}" .

echo "Saving image to tar..."
sudo nerdctl -n k8s.io save "${FULL_IMAGE}" -o "/tmp/${IMAGE_NAME}-${VERSION}.tar"

echo "Importing to k3s..."
sudo k3s ctr images import "/tmp/${IMAGE_NAME}-${VERSION}.tar"

echo "Cleaning up tar file..."
rm "/tmp/${IMAGE_NAME}-${VERSION}.tar"

echo "✅ AI Agent image built and imported: ${FULL_IMAGE}"
sudo k3s ctr images ls | grep "${IMAGE_NAME}"
