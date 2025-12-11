# Flink Job 1 - Unified Sessions Helm Chart

Helm chart for deploying a Flink streaming job that joins AAA login and CGNAT events, writing unified sessions to OpenSearch.

## Description

This chart deploys a Flink job using the Flink Kubernetes Operator that:
1. Reads from two Kafka topics: `aaalogin` and `cgnat`
2. Performs a time-windowed join on `publicIP`
3. Writes unified session records to OpenSearch

## Prerequisites

- Kubernetes cluster with Flink Kubernetes Operator installed
- Kafka cluster with topics `aaalogin` and `cgnat`
- OpenSearch cluster
- Custom Flink Docker image with Kafka and OpenSearch connectors

## Installation

### Build Custom Flink Image

```bash
# From project root
cd sql-job && mvn clean package && cd ..
cd docker
docker build -t flink-sql-job:1.19 .
minikube image load flink-sql-job:1.19
```

### Deploy Flink Job

```bash
# Install
helm install flink-job1 flink-job-chart/

# Upgrade
helm upgrade flink-job1 flink-job-chart/

# Uninstall
helm uninstall flink-job1
```

## Configuration

### Key Values

| Parameter | Description | Default |
|-----------|-------------|---------|
| `flinkJob.image.repository` | Flink Docker image | `flink-sql-job` |
| `flinkJob.image.tag` | Image tag | `1.19` |
| `flinkJob.jobManager.memory` | JobManager memory | `1024m` |
| `flinkJob.taskManager.memory` | TaskManager memory | `1024m` |
| `flinkJob.job.parallelism` | Job parallelism | `2` |
| `kafka.bootstrapServers` | Kafka bootstrap servers | `my-cluster-kafka-bootstrap.kafka.svc.cluster.local:9092` |
| `kafka.topics.aaalogin` | AAA login topic | `aaalogin` |
| `kafka.topics.cgnat` | CGNAT topic | `cgnat` |
| `opensearch.host` | OpenSearch host | `opensearch` |
| `opensearch.port` | OpenSearch port | `9200` |
| `opensearch.index` | Target index | `unified_sessions` |
| `sql.joinWindowMinutes` | Join time window | `5` |
| `sql.watermarkDelaySeconds` | Watermark delay | `5` |

### Custom Configuration

Create a `custom-values.yaml`:

```yaml
kafka:
  bootstrapServers: "kafka.example.com:9092"
  startupMode: "latest-offset"

opensearch:
  host: "opensearch.example.com"
  port: 9200

sql:
  joinWindowMinutes: 10
  watermarkDelaySeconds: 10

flinkJob:
  taskManager:
    replicas: 2
  job:
    parallelism: 4
```

Install with custom values:
```bash
helm install flink-job1 flink-job-chart/ -f custom-values.yaml
```

## Monitoring

### Check Job Status

```bash
# Get Flink deployment
kubectl get flinkdeployment

# Check pods
kubectl get pods -l app=flink-job1

# View logs
kubectl logs -l app=flink-job1 -c flink-main-container

# Follow logs
kubectl logs -f deployment/flink-job1 -c flink-main-container
```

### Verify Data Flow

```bash
# Check Kafka topics
kubectl exec -it my-cluster-kafka-0 -- bin/kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic aaalogin --from-beginning

# Check OpenSearch index
kubectl port-forward svc/opensearch 9200:9200
curl http://localhost:9200/unified_sessions/_count
```

## Troubleshooting

### Job Not Starting

```bash
# Check FlinkDeployment status
kubectl describe flinkdeployment flink-job1

# Check operator logs
kubectl logs -n flink-operator deployment/flink-kubernetes-operator
```

### No Data in OpenSearch

```bash
# Verify Kafka connectivity
kubectl exec deployment/flink-job1 -- nc -zv my-cluster-kafka-bootstrap 9092

# Verify OpenSearch connectivity
kubectl exec deployment/flink-job1 -- nc -zv opensearch 9200

# Check for errors in job logs
kubectl logs deployment/flink-job1 -c flink-main-container | grep -i error
```

### Connector Issues

```bash
# Verify connectors in image
kubectl exec deployment/flink-job1 -c flink-main-container -- ls -la /opt/flink/lib/
```

## Upgrade Strategy

The job uses `upgradeMode: stateless`, which means:
- No state is preserved between upgrades
- Job restarts from Kafka offsets (earliest/latest based on config)
- Fast deployment cycles

For production with state:
```yaml
flinkJob:
  job:
    upgradeMode: savepoint
    savepointTriggerNonce: 1  # Increment to trigger savepoint
```

## Data Schema

### Input: aaalogin Topic
```json
{
  "subscriberID": "1234567890",
  "publicIP": "203.0.113.1",
  "event_timestamp": "2025-12-03T10:00:00.000Z"
}
```

### Input: cgnat Topic
```json
{
  "event_timestamp": "2025-12-03T10:00:30.000Z",
  "privateIP": "10.0.0.1",
  "privatePort": 12345,
  "publicIP": "203.0.113.1",
  "publicPort": 54321,
  "protocol": "TCP",
  "natEvent": "allocation",
  "destinationIP": "93.184.216.34",
  "destinationPort": 443,
  "duration": 300
}
```

### Output: unified_sessions Index
```json
{
  "subscriberID": "1234567890",
  "publicIP": "203.0.113.1",
  "privateIP": "10.0.0.1",
  "privatePort": 12345,
  "publicPort": 54321,
  "protocol": "TCP",
  "natEvent": "allocation",
  "destinationIP": "93.184.216.34",
  "destinationPort": 443,
  "duration": 300,
  "loginTime": "2025-12-03T10:00:00.000Z",
  "cgnatTime": "2025-12-03T10:00:30.000Z"
}
```
