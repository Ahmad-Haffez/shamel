#!/bin/bash
# WiFi Aggregator Build and Deploy Script
# Run this on the K3s master node (shamel)

set -e

echo "==> Building Flink Java project..."
cd ~/POCchart/flink-java
mvn clean package

echo "==> Building containerd image with nerdctl..."
sudo nerdctl build -t wifi-aggregator:1.0 -n k8s.io .

echo "==> Image built successfully!"
sudo nerdctl images -n k8s.io | grep wifi-aggregator

echo "==> Restarting Flink deployment..."
cd ~/POCchart
kubectl delete flinkdeployment wifi-aggregator 2>/dev/null || true
helm upgrade shamelv2 ./helm-chart

echo "==> Done! Check status with: kubectl get flinkdeployment wifi-aggregator"
