const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');

const app = express();
const PORT = process.env.PORT || 3001;

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// ClickHouse configuration
const CLICKHOUSE_HOST = process.env.CLICKHOUSE_HOST || 'clickhouse-svc.default.svc.cluster.local';
const CLICKHOUSE_PORT = process.env.CLICKHOUSE_PORT || '8123';
const CLICKHOUSE_USER = process.env.CLICKHOUSE_USER || 'flink';
const CLICKHOUSE_PASSWORD = process.env.CLICKHOUSE_PASSWORD || '';

const CLICKHOUSE_URL = `http://${CLICKHOUSE_HOST}:${CLICKHOUSE_PORT}`;

// AI Agent configuration
const AI_AGENT_URL = process.env.AI_AGENT_URL || 'http://wifi-stats-ai-agent-svc.default.svc.cluster.local:8080';

// Audio Processor configuration
const AUDIO_PROCESSOR_URL = process.env.AUDIO_PROCESSOR_URL || 'http://audio-processor-svc.default.svc.cluster.local:8090';

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
        count() as connection_count,
        count(DISTINCT second_party) as unique_destinations
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

// Natural language query endpoint
app.post('/api/nl-query', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    console.log(`Natural language query: ${query}`);

    // Step 1: Call AI agent to convert NL to SQL
    const agentResponse = await axios.post(`${AI_AGENT_URL}/convert-nl-to-sql`, {
      query: query
    });

    const { sql, explanation, confidence, warnings } = agentResponse.data;
    console.log(`Generated SQL: ${sql}`);

    // Step 2: Execute the SQL against ClickHouse
    const result = await queryClickHouse(sql);

    // Step 3: Return results with metadata
    res.json({
      query: query,
      sql: sql,
      explanation: explanation,
      confidence: confidence,
      warnings: warnings || [],
      data: result.data,
      rows: result.rows,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Natural language query error:', error.message);
    
    // Provide more detailed error information
    if (error.response) {
      // AI agent or ClickHouse returned an error
      res.status(error.response.status || 500).json({
        error: error.response.data?.detail || error.response.data?.error || error.message,
        source: error.response.config?.url?.includes('ai-agent') ? 'ai-agent' : 'clickhouse'
      });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Audio Search Endpoints - Proxy to audio-processor service

// Upload audio file
app.post('/api/audio/upload-audio', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const formData = new FormData();
    formData.append('file', req.file.buffer, req.file.originalname);

    const response = await axios.post(`${AUDIO_PROCESSOR_URL}/upload-audio`, formData, {
      headers: formData.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    res.json(response.data);
  } catch (error) {
    console.error('Audio upload error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Search by text
app.post('/api/audio/search-by-text', upload.none(), async (req, res) => {
  try {
    const formData = new FormData();
    formData.append('query', req.body.query || '');
    formData.append('k', req.body.k || '10');

    const response = await axios.post(`${AUDIO_PROCESSOR_URL}/search-by-text`, formData, {
      headers: formData.getHeaders()
    });

    res.json(response.data);
  } catch (error) {
    console.error('Text search error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Search by audio
app.post('/api/audio/search-by-audio', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const formData = new FormData();
    formData.append('file', req.file.buffer, req.file.originalname);
    formData.append('k', req.body.k || '10');

    const response = await axios.post(`${AUDIO_PROCESSOR_URL}/search-by-audio`, formData, {
      headers: formData.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    res.json(response.data);
  } catch (error) {
    console.error('Audio search error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Hybrid search
app.post('/api/audio/hybrid-search', upload.single('audio_file'), async (req, res) => {
  try {
    const formData = new FormData();
    
    if (req.body.text_query) {
      formData.append('text_query', req.body.text_query);
    }
    if (req.file) {
      formData.append('audio_file', req.file.buffer, req.file.originalname);
    }
    formData.append('k', req.body.k || '10');
    formData.append('text_weight', req.body.text_weight || '0.5');
    formData.append('audio_weight', req.body.audio_weight || '0.5');

    const response = await axios.post(`${AUDIO_PROCESSOR_URL}/hybrid-search`, formData, {
      headers: formData.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    res.json(response.data);
  } catch (error) {
    console.error('Hybrid search error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// List audio files
app.get('/api/audio/list-audio', async (req, res) => {
  try {
    const response = await axios.get(`${AUDIO_PROCESSOR_URL}/list-audio`);
    res.json(response.data);
  } catch (error) {
    console.error('List audio error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Audio processor health check
app.get('/api/audio/health', async (req, res) => {
  try {
    const response = await axios.get(`${AUDIO_PROCESSOR_URL}/health`);
    res.json(response.data);
  } catch (error) {
    console.error('Audio processor health check failed:', error.message);
    res.status(500).json({ error: error.message, service: 'audio-processor' });
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
