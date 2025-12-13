import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import cors from 'cors';
import Keycloak from 'keycloak-connect';
import { createClient } from '@clickhouse/client';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ClickHouse client
const clickhouse = createClient({
  host: `http://${process.env.CLICKHOUSE_HOST}:${process.env.CLICKHOUSE_PORT}`,
  username: process.env.CLICKHOUSE_USER || 'flink',
  password: process.env.CLICKHOUSE_PASSWORD || '',
  database: 'default'
});

// Session configuration
const memoryStore = new session.MemoryStore();
app.use(session({
  secret: process.env.SESSION_SECRET || 'change-me',
  resave: false,
  saveUninitialized: true,
  store: memoryStore
}));

// Keycloak configuration
const keycloakConfig = {
  realm: process.env.KEYCLOAK_REALM || 'master',
  'auth-server-url': process.env.KEYCLOAK_URL || 'http://keycloak.local',
  'ssl-required': 'none',
  resource: process.env.KEYCLOAK_CLIENT_ID || 'wifi-stats-app',
  'public-client': false,
  credentials: {
    secret: process.env.KEYCLOAK_CLIENT_SECRET || ''
  },
  'confidential-port': 0
};

const keycloak = new Keycloak({ store: memoryStore }, keycloakConfig);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());
app.use(keycloak.middleware());

// Health check endpoint (no auth required)
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'wifi-stats-backend' });
});

// Protected API endpoints
app.get('/api/subscriber-stats', keycloak.protect(), async (req: Request, res: Response) => {
  try {
    const { subscriber, hours = '24', limit = '100' } = req.query;
    
    let query = `
      SELECT 
        timestamp,
        subscriber,
        second_party,
        bytes,
        last_seen
      FROM subscriber_stats
      WHERE timestamp >= now() - INTERVAL ${hours} HOUR
    `;
    
    if (subscriber) {
      query += ` AND subscriber = {subscriber:String}`;
    }
    
    query += ` ORDER BY timestamp DESC LIMIT ${limit}`;
    
    const resultSet = await clickhouse.query({
      query,
      query_params: subscriber ? { subscriber: subscriber as string } : undefined,
      format: 'JSONEachRow'
    });
    
    const data = await resultSet.json();
    
    res.json({
      success: true,
      data,
      count: data.length
    });
  } catch (error: any) {
    console.error('Error fetching subscriber stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch subscriber stats'
    });
  }
});

app.get('/api/global-stats', keycloak.protect(), async (req: Request, res: Response) => {
  try {
    const { hours = '24', limit = '100' } = req.query;
    
    const query = `
      SELECT 
        timestamp,
        second_party,
        packets,
        bytes,
        last_seen
      FROM global_stats
      WHERE timestamp >= now() - INTERVAL ${hours} HOUR
      ORDER BY timestamp DESC
      LIMIT ${limit}
    `;
    
    const resultSet = await clickhouse.query({
      query,
      format: 'JSONEachRow'
    });
    
    const data = await resultSet.json();
    
    res.json({
      success: true,
      data,
      count: data.length
    });
  } catch (error: any) {
    console.error('Error fetching global stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch global stats'
    });
  }
});

app.get('/api/anomalies', keycloak.protect(), async (req: Request, res: Response) => {
  try {
    const { severity, subscriber, hours = '24', limit = '100' } = req.query;
    
    let query = `
      SELECT 
        timestamp,
        detection_time,
        subscriber,
        second_party,
        anomaly_type,
        severity,
        anomaly_score,
        current_value,
        baseline_value,
        description
      FROM traffic_anomalies
      WHERE timestamp >= now() - INTERVAL ${hours} HOUR
    `;
    
    const params: any = {};
    
    if (severity) {
      query += ` AND severity = {severity:String}`;
      params.severity = severity;
    }
    
    if (subscriber) {
      query += ` AND subscriber = {subscriber:String}`;
      params.subscriber = subscriber;
    }
    
    query += ` ORDER BY timestamp DESC LIMIT ${limit}`;
    
    const resultSet = await clickhouse.query({
      query,
      query_params: Object.keys(params).length > 0 ? params : undefined,
      format: 'JSONEachRow'
    });
    
    const data = await resultSet.json();
    
    res.json({
      success: true,
      data,
      count: data.length
    });
  } catch (error: any) {
    console.error('Error fetching anomalies:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch anomalies'
    });
  }
});

app.get('/api/subscriber-summary', keycloak.protect(), async (req: Request, res: Response) => {
  try {
    const { hours = '24' } = req.query;
    
    const query = `
      SELECT 
        subscriber,
        COUNT(*) as connection_count,
        SUM(bytes) as total_bytes,
        COUNT(DISTINCT second_party) as unique_destinations,
        MAX(timestamp) as last_activity
      FROM subscriber_stats
      WHERE timestamp >= now() - INTERVAL ${hours} HOUR
      GROUP BY subscriber
      ORDER BY total_bytes DESC
    `;
    
    const resultSet = await clickhouse.query({
      query,
      format: 'JSONEachRow'
    });
    
    const data = await resultSet.json();
    
    res.json({
      success: true,
      data,
      count: data.length
    });
  } catch (error: any) {
    console.error('Error fetching subscriber summary:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch subscriber summary'
    });
  }
});

app.get('/api/top-destinations', keycloak.protect(), async (req: Request, res: Response) => {
  try {
    const { hours = '24', limit = '10' } = req.query;
    
    const query = `
      SELECT 
        second_party,
        SUM(bytes) as total_bytes,
        COUNT(DISTINCT subscriber) as unique_subscribers,
        MAX(last_seen) as last_seen
      FROM subscriber_stats
      WHERE timestamp >= now() - INTERVAL ${hours} HOUR
      GROUP BY second_party
      ORDER BY total_bytes DESC
      LIMIT ${limit}
    `;
    
    const resultSet = await clickhouse.query({
      query,
      format: 'JSONEachRow'
    });
    
    const data = await resultSet.json();
    
    res.json({
      success: true,
      data,
      count: data.length
    });
  } catch (error: any) {
    console.error('Error fetching top destinations:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch top destinations'
    });
  }
});

app.get('/api/anomaly-summary', keycloak.protect(), async (req: Request, res: Response) => {
  try {
    const { hours = '24' } = req.query;
    
    const query = `
      SELECT 
        severity,
        anomaly_type,
        COUNT(*) as count
      FROM traffic_anomalies
      WHERE timestamp >= now() - INTERVAL ${hours} HOUR
      GROUP BY severity, anomaly_type
      ORDER BY count DESC
    `;
    
    const resultSet = await clickhouse.query({
      query,
      format: 'JSONEachRow'
    });
    
    const data = await resultSet.json();
    
    res.json({
      success: true,
      data,
      count: data.length
    });
  } catch (error: any) {
    console.error('Error fetching anomaly summary:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch anomaly summary'
    });
  }
});

// Error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`WiFi Stats Backend running on port ${PORT}`);
  console.log(`Keycloak: ${keycloakConfig['auth-server-url']}`);
  console.log(`ClickHouse: ${process.env.CLICKHOUSE_HOST}:${process.env.CLICKHOUSE_PORT}`);
});
