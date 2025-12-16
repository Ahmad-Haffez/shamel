#!/bin/bash
# Deploy audio-processor to shamel node

set -e

echo "Step 1: Building audio-processor image on shamel..."
echo "Running build on shamel node..."

# Build on shamel
ssh a@192.168.100.177 "cd /tmp && \
    rm -rf shamel-build && \
    git clone https://github.com/Ahmad-Haffez/shamel.git shamel-build && \
    cd shamel-build/audio-search/audio-processor && \
    sudo nerdctl --namespace k8s.io build -t audio-processor:1.0 . && \
    sudo nerdctl --namespace k8s.io images | grep audio-processor"

echo ""
echo "Step 2: Deploying audio-processor..."
kubectl apply -f audio-processor-deployment.yaml

echo ""
echo "Step 3: Waiting for deployment..."
kubectl rollout status deployment/audio-processor

echo ""
echo "✅ Audio processor deployed successfully!"
echo ""
echo "Check status: kubectl get pods -l app=audio-processor"
echo "Check logs: kubectl logs -l app=audio-processor -f"
