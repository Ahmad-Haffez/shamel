# WiFi Stats Deployment Guide

## Architecture
- **Frontend**: React SPA served by nginx (containerized with static files)
- **Backend**: Node.js Express API querying ClickHouse
- **Ingress**: Nginx ingress controller with Keycloak OAuth
- **Data Flow**: Browser → nginx ingress (wifi-stats.local) → Frontend container OR Backend API → ClickHouse

## Build & Deploy Steps

### 1. Build Frontend Image (on shamel node)
```bash
# Copy build script to shamel
scp build-wifi-stats-frontend.sh a@192.168.100.177:~/POCchart/

# SSH to shamel and run
ssh a@192.168.100.177
chmod +x ~/POCchart/build-wifi-stats-frontend.sh
./POCchart/build-wifi-stats-frontend.sh 1.0
```

This script:
- Builds React app (`npm run build`)
- Copies build files to `wifi-stats-frontend/build/`
- Creates Docker image with nginx + static files
- Imports image to k3s containerd

### 2. Deploy Frontend
```bash
export KUBECONFIG=~/.kube/k3s-config
kubectl apply -f wifi-stats-frontend-k8s.yaml
```

Verify:
```bash
kubectl get pods -l app=wifi-stats-frontend
kubectl get svc wifi-stats-frontend-svc
```

### 3. Backend is Already Running
Backend was deployed earlier with corrected queries:
```bash
kubectl get pods -l app=wifi-stats-backend  # Should show 2 pods Running
kubectl get svc wifi-stats-backend-svc      # ClusterIP service on port 3001
```

### 4. Deploy Ingress
```bash
kubectl apply -f templates/wifi-stats-ingress.yaml
```

Verify:
```bash
kubectl get ingress wifi-stats-ingress
```

### 5. Add DNS Entry
Add to `/etc/hosts` on your local machine:
```
192.168.100.177  wifi-stats.local
```

### 6. Test Without OAuth First
Access: http://wifi-stats.local
- Should see React app
- Can query data from backend API
- All requests from same origin (no CORS)

### 7. Configure Keycloak OAuth (Later)
Uncomment OAuth annotations in `templates/wifi-stats-ingress.yaml` after creating Keycloak client

## Component Details

### Frontend Container
- **Image**: wifi-stats-frontend:1.0
- **Base**: nginx:alpine
- **Contents**: React build files + nginx config
- **Nginx Config**: Proxies `/api/*` to backend, serves static files for all other routes
- **Port**: 80

### Backend Service
- **Image**: wifi-stats-backend:1.3
- **Type**: Node.js Express
- **Endpoints**: `/api/subscriber-stats`, `/api/global-stats`, `/api/anomalies`, `/api/subscriber-summary`, `/api/top-destinations`, `/api/anomaly-summary`
- **Port**: 3001

### Ingress Rules
- **Host**: wifi-stats.local
- **Path `/`**: → Frontend service (nginx with React files)
- **Path `/api`**: → Backend service (proxied by frontend nginx)
- **OAuth**: Handled by nginx ingress controller (when enabled)

## Rebuild Frontend After Changes
```bash
# On shamel node
cd ~/POCchart/search-app
npm run build

# Rebuild image
cd ~/POCchart
./build-wifi-stats-frontend.sh 1.1  # Increment version

# On local machine - restart pods
export KUBECONFIG=~/.kube/k3s-config
kubectl delete pods -l app=wifi-stats-frontend
```

## Rebuild Backend After Changes
```bash
# On shamel node
./build-wifi-stats-backend.sh 1.4  # Increment version

# On local machine - restart pods
export KUBECONFIG=~/.kube/k3s-config
kubectl delete pods -l app=wifi-stats-backend
```
