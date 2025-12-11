
# POCchart - Alshamel Plus Multi-Site

Flink streaming job with OpenSearch sink and React search interface.

## Project Structure

```
POCchart/
├── helm-chart/          # Main Helm chart (infrastructure)
│   ├── Chart.yaml
│   ├── values.yaml
│   └── templates/       # Kafka, OpenSearch, MLflow, etc.
├── flink-job-chart/     # Flink job Helm chart (separate)
│   ├── Chart.yaml
│   ├── values.yaml
│   ├── templates/
│   └── README.md
├── sql-job/             # Flink SQL job (Java)
│   ├── pom.xml
│   └── src/
├── search-app/          # React search UI for OpenSearch
│   ├── package.json
│   └── src/
└── docker/              # Docker build files
    ├── Dockerfile       # Custom Flink image with connectors
    └── build-flink-job-image.sh
```

## Features
- Multi-site topology (2 sites) aligned with hardware summary
- Node roles: Kafka, Flink, ClickHouse, OpenSearch, MinIO, Keycloak, MLFlow
- Resource requests/limits based on Section 11.2 specs
- Flink SQL job: Kafka → Join → OpenSearch
- React search interface for querying unified sessions

## Quick Start

### Deploy Infrastructure

```bash
# Deploy Kafka, OpenSearch, MLflow, etc.
cd helm-chart
helm install shamelv2 .
```

### Deploy Flink Job

```bash
# Deploy Flink streaming job
cd flink-job-chart
helm install flink-job1 .

# Upgrade
helm upgrade flink-job1 .
```

### Build Custom Flink Image

```bash
# Build JAR
cd sql-job && mvn clean package && cd ..

# Build and load Docker image
cd docker
docker build -t flink-sql-job:1.19 .
minikube image load flink-sql-job:1.19
```

### Run Search Application

```bash
cd search-app
npm install
kubectl port-forward svc/opensearch 9200:9200
npm start
```

## Verify Deployment

```bash
# Check all pods
kubectl get pods

# Check Flink job logs
kubectl logs -l app=flink -c flink-main-container

# Verify OpenSearch
curl http://localhost:9200/_cluster/health
```
