# WiFi Stats Backend

OAuth-protected REST API for WiFi traffic analytics. Integrates Keycloak authentication with ClickHouse queries.

## Features

- **OAuth 2.0 Authentication**: Keycloak integration for secure access
- **ClickHouse Integration**: Query subscriber stats, global stats, and anomalies
- **RESTful API**: JSON endpoints for React frontend
- **Session Management**: Secure session handling with express-session

## API Endpoints

All endpoints require Bearer token authentication (except `/health`).

### Health Check
- `GET /health` - Service health status (no auth required)

### Statistics
- `GET /api/subscriber-stats` - Per-subscriber traffic statistics
  - Query params: `subscriber`, `hours`, `limit`
- `GET /api/global-stats` - Network-wide traffic statistics
  - Query params: `hours`, `limit`
- `GET /api/anomalies` - Detected traffic anomalies
  - Query params: `severity`, `subscriber`, `hours`, `limit`

### Aggregations
- `GET /api/subscriber-summary` - Subscriber activity summary
  - Query params: `hours`
- `GET /api/top-destinations` - Top traffic destinations
  - Query params: `hours`, `limit`
- `GET /api/anomaly-summary` - Anomaly breakdown by type/severity
  - Query params: `hours`

## Environment Variables

Create `.env` file:

```env
PORT=3001
CLICKHOUSE_HOST=clickhouse-svc.default.svc
CLICKHOUSE_PORT=8123
CLICKHOUSE_USER=flink
CLICKHOUSE_PASSWORD=
KEYCLOAK_URL=http://keycloak.local
KEYCLOAK_REALM=master
KEYCLOAK_CLIENT_ID=wifi-stats-app
KEYCLOAK_CLIENT_SECRET=your-client-secret
SESSION_SECRET=your-random-secret-key
FRONTEND_URL=http://localhost:3000
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build TypeScript
npm run build

# Run production
npm start
```

## Deployment

```bash
# Build Docker image
nerdctl build -t wifi-stats-backend:1.0 .

# Import to k3s
k3s ctr images import wifi-stats-backend-1.0.tar
```

## Keycloak Configuration

1. Create client `wifi-stats-app` in realm `master`
2. Client type: `confidential`
3. Valid redirect URIs: `http://wifi-stats.local/*`, `http://localhost:3000/*`
4. Web origins: `http://wifi-stats.local`, `http://localhost:3000`
5. Copy client secret to `.env`

## Architecture

```
React App → Keycloak OAuth → Backend API → ClickHouse
```

Users authenticate via Keycloak, receive JWT token, and use it to call backend API. Backend validates token and proxies ClickHouse queries.
