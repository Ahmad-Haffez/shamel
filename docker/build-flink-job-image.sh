#!/bin/bash
set -e

echo "Building SQL Job JAR..."
cd sql-job
mvn clean package
cd ..

echo "Building Docker image..."
docker build -t flink-sql-job:1.0 .

echo "Loading image into Minikube..."
minikube image load flink-sql-job:1.0

echo "Build complete! Image: flink-sql-job:1.0"
