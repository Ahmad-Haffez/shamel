import React from 'react';
import './AnomalyTable.css';

function AnomalyTable({ results, totalRows }) {
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getSeverityClass = (severity) => {
    return `severity-${severity.toLowerCase()}`;
  };

  const formatBytes = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="results-container anomaly-container">
      <div className="results-header">
        <h2>Anomalies Detected ({totalRows} rows)</h2>
      </div>
      
      <div className="table-wrapper">
        <table className="results-table anomaly-table">
          <thead>
            <tr>
              <th>Detection Time</th>
              <th>Subscriber</th>
              <th>Second Party</th>
              <th>Type</th>
              <th>Severity</th>
              <th>Score</th>
              <th>Current</th>
              <th>Baseline</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {results.map((row, index) => (
              <tr key={index} className={getSeverityClass(row.severity)}>
                <td>{formatTimestamp(row.detection_time)}</td>
                <td><strong>{row.subscriber}</strong></td>
                <td>{row.second_party}</td>
                <td><span className="anomaly-type">{row.anomaly_type}</span></td>
                <td><span className={`severity-badge ${getSeverityClass(row.severity)}`}>{row.severity}</span></td>
                <td>{row.anomaly_score.toFixed(2)}</td>
                <td>{formatBytes(row.current_value)}</td>
                <td>{formatBytes(Math.round(row.baseline_value))}</td>
                <td className="description">{row.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AnomalyTable;
