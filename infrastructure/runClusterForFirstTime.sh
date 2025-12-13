#!/bin/bash
# First Time Cluster Setup Script
# Creates multi-node Minikube cluster with CSI storage provisioner
# Profile: shamel

set -e  # Exit on error

PROFILE="shamel"
NODES=3
CPUS=4
MEMORY=8192

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Shamel Multi-Node Cluster Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if minikube is installed
if ! command -v minikube &> /dev/null; then
    echo -e "${RED}✗ minikube not found${NC}"
    echo -e "${YELLOW}Install from: https://minikube.sigs.k8s.io/docs/start/${NC}"
    exit 1
fi

# Check if helm is installed
if ! command -v helm &> /dev/null; then
    echo -e "${RED}✗ helm not found${NC}"
    echo -e "${YELLOW}Install from: https://helm.sh/docs/intro/install/${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites check passed${NC}"
echo ""

# Stop and delete existing cluster if exists
echo -e "${YELLOW}Checking for existing cluster...${NC}"
if minikube status -p "$PROFILE" &> /dev/null; then
    echo -e "${YELLOW}Existing cluster found. Deleting...${NC}"
    minikube stop -p "$PROFILE"
    minikube delete -p "$PROFILE"
    echo -e "${GREEN}✓ Old cluster deleted${NC}"
else
    echo -e "${GREEN}✓ No existing cluster found${NC}"
fi
echo ""

# Create new multi-node cluster
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Step 1: Creating Multi-Node Cluster${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${YELLOW}Profile: $PROFILE${NC}"
echo -e "${YELLOW}Nodes: $NODES${NC}"
echo -e "${YELLOW}CPUs: $CPUS${NC}"
echo -e "${YELLOW}Memory: ${MEMORY}MB${NC}"
echo ""

minikube start --nodes "$NODES" -p "$PROFILE" --cpus="$CPUS" --memory="$MEMORY"
echo -e "${GREEN}✓ Cluster created successfully${NC}"
echo ""

# Enable CSI hostpath driver
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Step 2: Enabling CSI Hostpath Driver${NC}"
echo -e "${BLUE}========================================${NC}"
minikube addons enable csi-hostpath-driver -p "$PROFILE"
echo -e "${GREEN}✓ CSI hostpath driver enabled${NC}"
echo ""

# Enable volume snapshots
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Step 3: Enabling Volume Snapshots${NC}"
echo -e "${BLUE}========================================${NC}"
minikube addons enable volumesnapshots -p "$PROFILE"
echo -e "${GREEN}✓ Volume snapshots enabled${NC}"
echo ""

# Disable default storage provisioner
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Step 4: Configuring Storage Classes${NC}"
echo -e "${BLUE}========================================${NC}"
minikube addons disable storage-provisioner -p "$PROFILE"
minikube addons disable default-storageclass -p "$PROFILE"
echo -e "${GREEN}✓ Default storage provisioner disabled${NC}"

# Set CSI as default storage class
minikube kubectl -p "$PROFILE" -- patch storageclass csi-hostpath-sc \
    -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'
echo -e "${GREEN}✓ CSI hostpath set as default storage class${NC}"
echo ""

# Enable ingress
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Step 5: Enabling Ingress Controller${NC}"
echo -e "${BLUE}========================================${NC}"
minikube addons enable ingress -p "$PROFILE"
echo -e "${GREEN}✓ Ingress controller enabled${NC}"
echo ""

# Get cluster info
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Step 6: Cluster Information${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${YELLOW}Nodes:${NC}"
minikube kubectl -p "$PROFILE" -- get nodes
echo ""

echo -e "${YELLOW}Storage Classes:${NC}"
minikube kubectl -p "$PROFILE" -- get storageclass
echo ""

echo -e "${YELLOW}Cluster Status:${NC}"
minikube status -p "$PROFILE"
echo ""

# Install Strimzi Kafka Operator
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Step 7: Installing Strimzi Kafka Operator${NC}"
echo -e "${BLUE}========================================${NC}"
minikube kubectl -p "$PROFILE" -- create namespace kafka
helm install strimzi-kafka oci://quay.io/strimzi-helm/strimzi-kafka-operator \
    -n kafka \
    --kubeconfig ~/.kube/config \
    --kube-context "$PROFILE"
echo -e "${GREEN}✓ Strimzi Kafka Operator installed${NC}"
echo ""

# Wait for Strimzi operator to be ready
echo -e "${YELLOW}Waiting for Strimzi operator to be ready...${NC}"
minikube kubectl -p "$PROFILE" -- wait --for=condition=ready pod \
    -l name=strimzi-cluster-operator \
    -n kafka \
    --timeout=300s
echo -e "${GREEN}✓ Strimzi operator is ready${NC}"
echo ""

# Deploy Kafka cluster on node1 (shamel)
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Step 8: Deploying Kafka Cluster${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${YELLOW}Deploying Kafka cluster to node 'shamel' (control plane)${NC}"
minikube kubectl -p "$PROFILE" -- apply -f kafka-cluster.yaml
echo -e "${GREEN}✓ Kafka cluster deployment initiated${NC}"
echo ""

# Wait for Kafka to be ready
echo -e "${YELLOW}Waiting for Kafka cluster to be ready (this may take a few minutes)...${NC}"
minikube kubectl -p "$PROFILE" -- wait --for=condition=ready kafka/my-cluster \
    -n kafka \
    --timeout=600s || echo -e "${YELLOW}⚠ Kafka may need more time to start${NC}"
echo ""

# Install Flink Operator
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Step 9: Installing Flink Operator${NC}"
echo -e "${BLUE}========================================${NC}"
minikube kubectl -p "$PROFILE" -- create -f https://github.com/apache/flink-kubernetes-operator/releases/download/release-1.10.0/flink-kubernetes-operator-1.10.0.yaml
echo -e "${GREEN}✓ Flink Operator installed${NC}"
echo ""

# Wait for Flink operator to be ready
echo -e "${YELLOW}Waiting for Flink operator to be ready...${NC}"
sleep 10
minikube kubectl -p "$PROFILE" -- wait --for=condition=ready pod \
    -l app.kubernetes.io/name=flink-kubernetes-operator \
    -n flink-kubernetes-operator \
    --timeout=300s || echo -e "${YELLOW}⚠ Flink operator may need more time${NC}"
echo ""

# Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Cluster Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Node Distribution:${NC}"
echo -e "  • ${BLUE}shamel${NC} (control plane + node1): All services, Kafka, Flink"
echo -e "  • ${BLUE}shamel-m02${NC} (node2): WiFi packet capture producer"
echo -e "  • ${BLUE}shamel-m03${NC} (node3): Available for scaling"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "1. Deploy infrastructure:"
echo -e "   ${BLUE}helm install shamelv2 ./helm-chart --kube-context $PROFILE${NC}"
echo ""
echo -e "2. Deploy Flink job:"
echo -e "   ${BLUE}helm install flink-job ./flink-job-chart --kube-context $PROFILE${NC}"
echo ""
echo -e "3. Check pod distribution:"
echo -e "   ${BLUE}minikube kubectl -p $PROFILE -- get pods -A -o wide${NC}"
echo ""
echo -e "4. Dashboard:"
echo -e "   ${BLUE}minikube dashboard -p $PROFILE${NC}"
echo ""
echo -e "5. Get ingress IP:"
echo -e "   ${BLUE}minikube ip -p $PROFILE${NC}"
echo ""
echo -e "${GREEN}Profile name: $PROFILE${NC}"
echo -e "${GREEN}========================================${NC}"
