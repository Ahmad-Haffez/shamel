import React from 'react';
import './SummaryDashboard.css';

function SummaryDashboard({ data }) {
  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="dashboard">
      <div className="dashboard-section">
        <h2>Subscriber Summary</h2>
        <div className="card-grid">
          {data.subscribers.map((sub, index) => (
            <div key={index} className="dashboard-card">
              <h3>{sub.subscriber}</h3>
              <div className="stat-row">
                <span className="stat-label">Total Traffic:</span>
                <span className="stat-value">{formatBytes(sub.total_bytes)}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Connections:</span>
                <span className="stat-value">{sub.connection_count}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Destinations:</span>
                <span className="stat-value">{sub.unique_destinations}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="dashboard-section">
        <h2>Top Destinations</h2>
        <div className="table-container">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Destination</th>
                <th>Total Traffic</th>
                <th>Unique Subscribers</th>
              </tr>
            </thead>
            <tbody>
              {data.topDestinations.map((dest, index) => (
                <tr key={index}>
                  <td>{dest.second_party}</td>
                  <td>{formatBytes(dest.total_bytes)}</td>
                  <td>{dest.unique_subscribers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="dashboard-section">
        <h2>Anomaly Summary</h2>
        {data.anomalies.length > 0 ? (
          <div className="anomaly-grid">
            {data.anomalies.map((anomaly, index) => (
              <div key={index} className={`anomaly-card severity-${anomaly.severity.toLowerCase()}`}>
                <div className="anomaly-count">{anomaly.count}</div>
                <div className="anomaly-type">{anomaly.anomaly_type}</div>
                <div className="anomaly-severity">{anomaly.severity}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-anomalies">
            <p>✅ No anomalies detected in the last 24 hours</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SummaryDashboard;
