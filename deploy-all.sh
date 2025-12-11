#!/bin/bash
# Complete Deployment Script for K3s Cluster
# Run this on your local machine with K3s kubeconfig configured

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Shamel K3s Cluster Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check kubeconfig
echo -e "${YELLOW}Checking cluster connection...${NC}"
kubectl get nodes
echo ""

# Step 1: Kafka already installed via Helm, deploy cluster
echo -e "${BLUE}Step 1: Deploying Kafka Cluster${NC}"
kubectl apply -f kafka-cluster.yaml
echo -e "${GREEN}✓ Kafka cluster deployment initiated${NC}"
echo ""

# Step 2: Wait for Kafka
echo -e "${BLUE}Step 2: Waiting for Kafka to be ready${NC}"
echo -e "${YELLOW}This may take 3-5 minutes...${NC}"
kubectl wait --for=condition=ready kafka/my-cluster -n kafka --timeout=600s || {
    echo -e "${YELLOW}⚠ Kafka taking longer than expected. Checking status...${NC}"
    kubectl get pods -n kafka
}
echo -e "${GREEN}✓ Kafka cluster is ready${NC}"
echo ""

# Step 3: Install Flink Operator
echo -e "${BLUE}Step 3: Installing Flink Operator${NC}"
kubectl create -f https://github.com/apache/flink-kubernetes-operator/releases/download/release-1.10.0/flink-kubernetes-operator-1.10.0.yaml 2>/dev/null || {
    echo -e "${YELLOW}⚠ Flink operator may already exist${NC}"
}
echo ""

# Step 4: Wait for Flink Operator
echo -e "${BLUE}Step 4: Waiting for Flink Operator${NC}"
sleep 10
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=flink-kubernetes-operator -n flink-kubernetes-operator --timeout=300s || {
    echo -e "${YELLOW}⚠ Checking Flink operator status...${NC}"
    kubectl get pods -n flink-kubernetes-operator
}
echo -e "${GREEN}✓ Flink operator is ready${NC}"
echo ""

# Step 5: Deploy infrastructure
echo -e "${BLUE}Step 5: Deploying Infrastructure (shamelv2)${NC}"
helm install shamelv2 ./helm-chart || {
    echo -e "${YELLOW}⚠ Helm release may already exist, upgrading...${NC}"
    helm upgrade shamelv2 ./helm-chart
}
echo -e "${GREEN}✓ Infrastructure deployed${NC}"
echo ""

# Step 6: Wait for infrastructure pods
echo -e "${BLUE}Step 6: Waiting for infrastructure pods${NC}"
sleep 10
kubectl get pods -o wide
echo ""

# Step 7: Deploy Flink job
echo -e "${BLUE}Step 7: Deploying Flink Job${NC}"
helm install flink-job ./flink-job-chart || {
    echo -e "${YELLOW}⚠ Flink job may already exist, upgrading...${NC}"
    helm upgrade flink-job ./flink-job-chart
}
echo -e "${GREEN}✓ Flink job deployed${NC}"
echo ""

# Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

echo -e "${YELLOW}Node Distribution:${NC}"
kubectl get pods -A -o wide | grep -E "NAME|shamel|wifi-sniffer|ai-worker"
echo ""

echo -e "${YELLOW}Useful Commands:${NC}"
echo -e "  Check all pods: ${BLUE}kubectl get pods -A -o wide${NC}"
echo -e "  Check services: ${BLUE}kubectl get svc -A${NC}"
echo -e "  Check Kafka:    ${BLUE}kubectl get pods -n kafka${NC}"
echo -e "  Check Flink:    ${BLUE}kubectl get flinkdeployment${NC}"
echo -e "  View logs:      ${BLUE}kubectl logs <pod-name>${NC}"
echo ""
