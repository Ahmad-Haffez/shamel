import React from 'react';

interface NLQueryResult {
  query: string;
  sql: string;
  explanation: string;
  confidence: number;
  warnings: string[];
  data: any[];
  rows: number;
  timestamp: string;
}

interface Props {
  result: NLQueryResult;
  onClear: () => void;
}

const QueryResultDisplay: React.FC<Props> = ({ result, onClear }) => {
  const [showSQL, setShowSQL] = useState(false);

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'object') return JSON.stringify(value);
    if (typeof value === 'number') {
      // Format large numbers with commas
      return value.toLocaleString();
    }
    return String(value);
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'confidence-high';
    if (confidence >= 0.6) return 'confidence-medium';
    return 'confidence-low';
  };

  return (
    <div className="query-result-display">
      <div className="result-header">
        <div className="result-header-left">
          <h3>Query Results</h3>
          <span className={`confidence-badge ${getConfidenceColor(result.confidence)}`}>
            Confidence: {(result.confidence * 100).toFixed(0)}%
          </span>
        </div>
        <button onClick={onClear} className="clear-button">
          Clear Results
        </button>
      </div>

      <div className="result-metadata">
        <div className="metadata-item">
          <strong>Question:</strong> {result.query}
        </div>
        <div className="metadata-item">
          <strong>Explanation:</strong> {result.explanation}
        </div>
        <div className="metadata-item">
          <strong>Results:</strong> {result.rows} row{result.rows !== 1 ? 's' : ''} returned
        </div>
        
        {result.warnings && result.warnings.length > 0 && (
          <div className="warnings">
            <strong>Warnings:</strong>
            <ul>
              {result.warnings.map((warning, idx) => (
                <li key={idx}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="sql-toggle">
          <button onClick={() => setShowSQL(!showSQL)} className="toggle-button">
            {showSQL ? 'Hide' : 'Show'} Generated SQL
          </button>
          {showSQL && (
            <pre className="sql-code">
              <code>{result.sql}</code>
            </pre>
          )}
        </div>
      </div>

      {result.data && result.data.length > 0 ? (
        <div className="result-table-container">
          <table className="result-table">
            <thead>
              <tr>
                {Object.keys(result.data[0]).map((key) => (
                  <th key={key}>{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.data.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {Object.values(row).map((value, colIndex) => (
                    <td key={colIndex}>{formatValue(value)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="no-results">
          No data returned from the query.
        </div>
      )}
    </div>
  );
};

const { useState } = React;

export default QueryResultDisplay;
