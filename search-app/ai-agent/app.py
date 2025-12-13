from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
import httpx
import json
import re
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="WiFi Stats AI Agent", version="1.0.0")

# LLaMA 3 serving endpoint (will be deployed via vLLM)
LLM_SERVICE_URL = "http://llama3-service.default.svc.cluster.local:8000/v1/completions"

# ClickHouse schema context
CLICKHOUSE_SCHEMA = """
Available tables in ClickHouse:

1. subscriber_stats
   - timestamp (DateTime): When the traffic was recorded
   - subscriber (String): MAC address of the subscriber device
   - second_party (String): MAC address of the destination/peer device
   - bytes (UInt64): Number of bytes transferred
   - last_seen (DateTime): Last time this connection was observed

2. global_stats
   - timestamp (DateTime): When the traffic was recorded
   - second_party (String): MAC address of the destination device
   - packets (UInt64): Number of packets transferred
   - bytes (UInt64): Number of bytes transferred
   - last_seen (DateTime): Last time this traffic was observed

3. traffic_anomalies
   - timestamp (DateTime): When the traffic occurred
   - detection_time (DateTime): When the anomaly was detected
   - subscriber (String): MAC address of the subscriber
   - second_party (String): MAC address of the destination
   - anomaly_type (String): Type of anomaly (TRAFFIC_SPIKE, NEW_CONNECTION, TRAFFIC_DROP)
   - severity (Enum: LOW, MEDIUM, HIGH, CRITICAL): Severity level
   - anomaly_score (Float64): Numerical anomaly score
   - current_value (Float64): Current metric value
   - baseline_value (Float64): Expected baseline value
   - description (String): Human-readable description

Query Guidelines:
- Use proper ClickHouse SQL syntax
- For time ranges, use: WHERE timestamp > now() - INTERVAL X HOUR
- For aggregations: GROUP BY, SUM(), COUNT(), AVG()
- For sorting: ORDER BY ... DESC LIMIT N
- Always include timestamp in WHERE clause for performance
- Use LIMIT to restrict large result sets
"""

SYSTEM_PROMPT = f"""You are a SQL expert that converts natural language questions into ClickHouse SQL queries.

{CLICKHOUSE_SCHEMA}

Rules:
1. Generate ONLY valid ClickHouse SQL queries (SELECT statements only)
2. NO DROP, DELETE, UPDATE, INSERT, or ALTER statements
3. Always include a WHERE clause with timestamp filter (default: last 24 hours)
4. Use proper ClickHouse functions and syntax
5. Add LIMIT clause (default: 100) to prevent large result sets
6. Return the SQL query wrapped in ```sql code blocks

Examples:
User: "Show me the top 10 subscribers by data usage"
SQL:
```sql
SELECT subscriber, SUM(bytes) as total_bytes 
FROM subscriber_stats 
WHERE timestamp > now() - INTERVAL 24 HOUR 
GROUP BY subscriber 
ORDER BY total_bytes DESC 
LIMIT 10
```

User: "Find all critical anomalies in the last hour"
SQL:
```sql
SELECT * FROM traffic_anomalies 
WHERE detection_time > now() - INTERVAL 1 HOUR 
AND severity = 'CRITICAL' 
ORDER BY detection_time DESC 
LIMIT 100
```

User: "What are the most common destinations?"
SQL:
```sql
SELECT second_party, COUNT(*) as connection_count, SUM(bytes) as total_bytes 
FROM subscriber_stats 
WHERE timestamp > now() - INTERVAL 24 HOUR 
GROUP BY second_party 
ORDER BY total_bytes DESC 
LIMIT 20
```

Now convert the user's question into a ClickHouse SQL query following these rules.
"""


class QueryRequest(BaseModel):
    query: str
    context: Optional[Dict[str, Any]] = None


class QueryResponse(BaseModel):
    sql: str
    explanation: str
    confidence: float
    warnings: list[str] = []


async def call_llama3(prompt: str) -> str:
    """Call LLaMA 3 model via vLLM service"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                LLM_SERVICE_URL,
                json={
                    "prompt": prompt,
                    "max_tokens": 500,
                    "temperature": 0.1,  # Low temperature for deterministic SQL
                    "top_p": 0.9,
                    "stop": ["```\n\n", "User:", "\n\n\n"]
                }
            )
            response.raise_for_status()
            result = response.json()
            return result["choices"][0]["text"].strip()
    except Exception as e:
        logger.error(f"Error calling LLaMA 3: {e}")
        raise HTTPException(status_code=503, detail=f"LLM service unavailable: {str(e)}")


def extract_sql(llm_output: str) -> str:
    """Extract SQL query from LLM output"""
    # Look for SQL code block
    sql_match = re.search(r'```sql\s*\n(.*?)\n```', llm_output, re.DOTALL | re.IGNORECASE)
    if sql_match:
        return sql_match.group(1).strip()
    
    # Fallback: look for any code block
    code_match = re.search(r'```\s*\n(.*?)\n```', llm_output, re.DOTALL)
    if code_match:
        return code_match.group(1).strip()
    
    # Last resort: return the whole output
    return llm_output.strip()


def validate_sql(sql: str) -> tuple[bool, list[str]]:
    """Validate SQL query for safety and correctness"""
    warnings = []
    
    # Convert to uppercase for checks
    sql_upper = sql.upper()
    
    # Forbidden operations
    forbidden = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE', 'TRUNCATE', 'GRANT', 'REVOKE']
    for keyword in forbidden:
        if keyword in sql_upper:
            return False, [f"Forbidden keyword detected: {keyword}"]
    
    # Must be SELECT query
    if not sql_upper.strip().startswith('SELECT'):
        return False, ["Query must be a SELECT statement"]
    
    # Check for LIMIT clause
    if 'LIMIT' not in sql_upper:
        warnings.append("No LIMIT clause - adding LIMIT 100 for safety")
        sql += " LIMIT 100"
    
    # Check for WHERE clause with timestamp
    if 'WHERE' not in sql_upper:
        warnings.append("No WHERE clause - query may be slow on large datasets")
    elif 'TIMESTAMP' not in sql_upper and 'DETECTION_TIME' not in sql_upper:
        warnings.append("No timestamp filter - query may be slow")
    
    return True, warnings


def extract_explanation(llm_output: str, sql: str) -> str:
    """Extract explanation from LLM output"""
    # Remove the SQL code block
    explanation = re.sub(r'```sql\s*\n.*?\n```', '', llm_output, flags=re.DOTALL | re.IGNORECASE)
    explanation = re.sub(r'```\s*\n.*?\n```', '', explanation, flags=re.DOTALL)
    explanation = explanation.strip()
    
    # If no explanation found, generate basic one
    if not explanation or len(explanation) < 10:
        explanation = f"Generated SQL query to answer: {sql[:100]}..."
    
    return explanation


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "ai-agent"}


@app.post("/convert-nl-to-sql", response_model=QueryResponse)
async def convert_natural_language_to_sql(request: QueryRequest):
    """Convert natural language query to SQL"""
    logger.info(f"Received query: {request.query}")
    
    try:
        # Build prompt for LLaMA 3
        user_prompt = f"{SYSTEM_PROMPT}\n\nUser question: {request.query}\n\nSQL:"
        
        # Call LLaMA 3
        llm_output = await call_llama3(user_prompt)
        logger.info(f"LLM output: {llm_output}")
        
        # Extract SQL from output
        sql = extract_sql(llm_output)
        
        # Validate SQL
        is_valid, warnings = validate_sql(sql)
        if not is_valid:
            raise HTTPException(status_code=400, detail=f"Invalid SQL generated: {warnings[0]}")
        
        # Extract explanation
        explanation = extract_explanation(llm_output, sql)
        
        # Calculate confidence (simple heuristic)
        confidence = 0.9 if 'SELECT' in sql.upper() and 'FROM' in sql.upper() else 0.5
        
        return QueryResponse(
            sql=sql,
            explanation=explanation,
            confidence=confidence,
            warnings=warnings
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing query: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing query: {str(e)}")


@app.get("/schema")
async def get_schema():
    """Return the ClickHouse schema information"""
    return {
        "schema": CLICKHOUSE_SCHEMA,
        "tables": ["subscriber_stats", "global_stats", "traffic_anomalies"]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
