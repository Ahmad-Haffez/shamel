#!/bin/bash
# Script to build Flink job, create Docker image, and import to k3s

set -e

echo "Building Flink Java project..."
cd ~/POCchart/flink-pipelines/pipeline-wifi-stats

# Build with Maven
echo "Running Maven package..."
mvn clean package -DskipTests

if [ ! -f target/wifi-aggregator-1.0-SNAPSHOT.jar ]; then
    echo "❌ Maven build failed - JAR file not found"
    exit 1
fi

echo "✅ Maven build successful"

# Get version from user or use default
VERSION=${1:-1.0}

echo "Building Docker image version $VERSION..."
sudo nerdctl --namespace k8s.io build --no-cache -t wifi-agg:$VERSION .

echo "Saving and importing to k3s..."
sudo nerdctl --namespace k8s.io save wifi-agg:$VERSION | sudo k3s ctr images import -

echo "Tagging as latest..."
sudo ctr -n k8s.io images tag docker.io/library/wifi-agg:$VERSION docker.io/library/wifi-agg:latest

echo ""
echo "✅ Image wifi-agg:$VERSION built and imported successfully!"
echo ""
echo "JAR file: target/wifi-aggregator-1.0-SNAPSHOT.jar"
echo ""
echo "To deploy, run on your local machine:"
echo "  kubectl delete flinkdeployment wifi-agg"
echo "  kubectl apply -f ~/POCchart/templates/job1-flinkdeployment.yaml"
