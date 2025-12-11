# Unified Sessions Search Application

React application for searching unified session records stored in OpenSearch.

## Features

- **Time Range Search**: Filter sessions by login time range
- **Subscriber ID Search**: Find sessions by MSISDN/subscriber ID
- **IP Address Search**: Search by public or private IP addresses
- **Real-time Results**: Display results in an organized table format
- **Responsive Design**: Works on desktop and mobile devices

## Prerequisites

- Node.js 16+ and npm
- OpenSearch running and accessible
- Unified sessions data in OpenSearch index

## Installation

1. Install dependencies:
```bash
cd search-app
npm install
```

2. Configure OpenSearch URL:
```bash
cp .env.example .env
```

Edit `.env` and set your OpenSearch URL:
```
REACT_APP_OPENSEARCH_URL=http://localhost:9200
```

## Running Locally

### Option 1: Direct Access to OpenSearch
If OpenSearch is running locally on port 9200:
```bash
npm start
```

### Option 2: Port Forward from Kubernetes
If OpenSearch is running in Minikube:
```bash
# In a separate terminal, forward OpenSearch port
kubectl port-forward svc/opensearch 9200:9200

# Then start the React app
npm start
```

The application will open at `http://localhost:3000`

## Usage

1. **Search by Time Range**:
   - Select start and/or end time
   - Click "Search"

2. **Search by Subscriber ID**:
   - Enter the subscriber ID (MSISDN)
   - Click "Search"

3. **Search by IP Address**:
   - Enter public or private IP
   - Click "Search"

4. **Combined Search**:
   - Fill multiple fields for AND search
   - All specified criteria must match

## Building for Production

```bash
npm run build
```

This creates an optimized build in the `build/` directory.

## Deployment Options

### Option 1: Deploy to Kubernetes

Create a Dockerfile:
```dockerfile
FROM node:16-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Build and deploy:
```bash
docker build -t search-app:1.0 .
kubectl create deployment search-app --image=search-app:1.0
kubectl expose deployment search-app --port=80 --type=NodePort
```

### Option 2: Serve Locally
```bash
npm install -g serve
serve -s build -p 3000
```

## OpenSearch Configuration

The app expects an OpenSearch index named `unified_sessions` with the following fields:
- subscriberID (text/keyword)
- publicIP (text/keyword)
- privateIP (text/keyword)
- privatePort (integer)
- publicPort (integer)
- protocol (text/keyword)
- natEvent (text/keyword)
- destinationIP (text/keyword)
- destinationPort (integer)
- duration (long)
- loginTime (date)
- cgnatTime (date)

## CORS Configuration

If you encounter CORS errors, configure OpenSearch to allow your React app origin:

Add to `opensearch.yml`:
```yaml
http.cors.enabled: true
http.cors.allow-origin: "http://localhost:3000"
http.cors.allow-credentials: true
http.cors.allow-headers: "X-Requested-With,Content-Type,Content-Length,Authorization"
```

## Troubleshooting

### Cannot connect to OpenSearch
- Verify OpenSearch is running: `curl http://localhost:9200`
- Check port forwarding is active
- Verify CORS settings in OpenSearch

### No results found
- Check data exists in index: `curl http://localhost:9200/unified_sessions/_count`
- Verify Flink job is running and writing data
- Check search parameters match your data format

### Build errors
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Clear npm cache: `npm cache clean --force`

## License

MIT
