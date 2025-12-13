const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;

// ClickHouse configuration
const CLICKHOUSE_HOST = process.env.CLICKHOUSE_HOST || 'clickhouse-svc.default.svc.cluster.local';
const CLICKHOUSE_PORT = process.env.CLICKHOUSE_PORT || '8123';
const CLICKHOUSE_USER = process.env.CLICKHOUSE_USER || 'flink';
const CLICKHOUSE_PASSWORD = process.env.CLICKHOUSE_PASSWORD || '';

const CLICKHOUSE_URL = `http://${CLICKHOUSE_HOST}:${CLICKHOUSE_PORT}`;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Helper function to query ClickHouse
async function queryClickHouse(query) {
  try {
    const response = await axios.post(CLICKHOUSE_URL, query, {
      params: {
        user: CLICKHOUSE_USER,
        password: CLICKHOUSE_PASSWORD,
        default_format: 'JSON'
      },
      headers: {
        'Content-Type': 'text/plain'
      }
    });

    return {
      data: response.data.data || [],
      rows: response.data.rows || 0
    };
  } catch (error) {
    console.error('ClickHouse query error:', error.message);
    throw new Error(`ClickHouse query failed: ${error.message}`);
  }
}

// API Endpoints

// Get subscriber statistics
app.get('/api/subscriber-stats', async (req, res) => {
  try {
    const { hours = 1, subscriber, limit = 100 } = req.query;

    let query = `
      SELECT 
        timestamp,
        subscriber,
        second_party,
        bytes
      FROM subscriber_stats
      WHERE timestamp >= now() - INTERVAL ${parseInt(hours)} HOUR
    `;

    if (subscriber) {
      query += ` AND subscriber = '${subscriber}'`;
    }

    query += `
      ORDER BY timestamp DESC
      LIMIT ${parseInt(limit)}
    `;

    const result = await queryClickHouse(query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get global statistics
app.get('/api/global-stats', async (req, res) => {
  try {
    const { hours = 1, limit = 100 } = req.query;

    const query = `
      SELECT 
        timestamp,
        second_party,
        packets,
        bytes
      FROM global_stats
      WHERE timestamp >= now() - INTERVAL ${parseInt(hours)} HOUR
      ORDER BY timestamp DESC
      LIMIT ${parseInt(limit)}
    `;

    const result = await queryClickHouse(query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get anomalies
app.get('/api/anomalies', async (req, res) => {
  try {
    const { hours = 1, subscriber, severity, limit = 100 } = req.query;

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
      WHERE timestamp >= now() - INTERVAL ${parseInt(hours)} HOUR
    `;

    if (subscriber) {
      query += ` AND subscriber = '${subscriber}'`;
    }

    if (severity) {
      query += ` AND severity = '${severity}'`;
    }

    query += `
      ORDER BY detection_time DESC
      LIMIT ${parseInt(limit)}
    `;

    const result = await queryClickHouse(query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get subscriber summary
app.get('/api/subscriber-summary', async (req, res) => {
  try {
    const { hours = 24 } = req.query;

    const query = `
      SELECT 
        subscriber,
        sum(bytes) as total_bytes,
        count(DISTINCT second_party) as unique_connections
      FROM subscriber_stats
      WHERE timestamp >= now() - INTERVAL ${parseInt(hours)} HOUR
      GROUP BY subscriber
      ORDER BY total_bytes DESC
      LIMIT 10
    `;

    const result = await queryClickHouse(query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get top destinations
app.get('/api/top-destinations', async (req, res) => {
  try {
    const { hours = 24, limit = 10 } = req.query;

    const query = `
      SELECT 
        second_party as destination,
        count() as connection_count,
        sum(bytes) as total_bytes,
        count(DISTINCT subscriber) as unique_subscribers
      FROM subscriber_stats
      WHERE timestamp >= now() - INTERVAL ${parseInt(hours)} HOUR
      GROUP BY second_party
      ORDER BY total_bytes DESC
      LIMIT ${parseInt(limit)}
    `;

    const result = await queryClickHouse(query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get anomaly summary
app.get('/api/anomaly-summary', async (req, res) => {
  try {
    const { hours = 24 } = req.query;

    const query = `
      SELECT 
        severity,
        count() as anomaly_count,
        count(DISTINCT subscriber) as affected_subscribers
      FROM traffic_anomalies
      WHERE timestamp >= now() - INTERVAL ${parseInt(hours)} HOUR
      GROUP BY severity
      ORDER BY 
        CASE severity
          WHEN 'CRITICAL' THEN 1
          WHEN 'HIGH' THEN 2
          WHEN 'MEDIUM' THEN 3
          WHEN 'LOW' THEN 4
        END
    `;

    const result = await queryClickHouse(query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`WiFi Stats Backend running on port ${PORT}`);
  console.log(`ClickHouse: ${CLICKHOUSE_URL}`);
});
