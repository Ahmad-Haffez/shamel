import React from 'react';
import { TrafficAnomaly } from '../types';
import './AnomalyTable.css';

interface AnomalyTableProps {
  results: TrafficAnomaly[];
  totalRows: number;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

const getSeverityClass = (severity: string): string => {
  switch (severity.toUpperCase()) {
    case 'CRITICAL': return 'severity-critical';
    case 'HIGH': return 'severity-high';
    case 'MEDIUM': return 'severity-medium';
    case 'LOW': return 'severity-low';
    default: return '';
  }
};

const AnomalyTable: React.FC<AnomalyTableProps> = ({ results, totalRows }) => {
  return (
    <div className="anomaly-table-container">
      <div className="results-info">
        <p>Showing {results.length} of {totalRows} anomalies</p>
      </div>
      
      <div className="table-wrapper">
        <table className="anomaly-table">
          <thead>
            <tr>
              <th>Detection Time</th>
              <th>Timestamp</th>
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
            {results.map((anomaly, idx) => (
              <tr key={idx}>
                <td>{formatTimestamp(anomaly.detection_time)}</td>
                <td>{formatTimestamp(anomaly.timestamp)}</td>
                <td className="mac-address">{anomaly.subscriber}</td>
                <td className="mac-address">{anomaly.second_party}</td>
                <td className="anomaly-type">{anomaly.anomaly_type}</td>
                <td>
                  <span className={`severity-badge ${getSeverityClass(anomaly.severity)}`}>
                    {anomaly.severity}
                  </span>
                </td>
                <td className="numeric">{anomaly.anomaly_score.toFixed(2)}</td>
                <td className="numeric">{formatBytes(anomaly.current_value)}</td>
                <td className="numeric">{formatBytes(anomaly.baseline_value)}</td>
                <td className="description">{anomaly.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AnomalyTable;
