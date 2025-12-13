import React from 'react';
import { DashboardData } from '../types';
import './SummaryDashboard.css';

interface SummaryDashboardProps {
  data: DashboardData;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

const SummaryDashboard: React.FC<SummaryDashboardProps> = ({ data }) => {
  return (
    <div className="summary-dashboard">
      <section className="dashboard-section">
        <h2>Subscriber Activity (Last 24 Hours)</h2>
        <div className="subscriber-grid">
          {data.subscribers.map((sub, idx) => (
            <div key={idx} className="subscriber-card">
              <h3 className="subscriber-mac">{sub.subscriber}</h3>
              <div className="stat-row">
                <span className="stat-label">Total Traffic:</span>
                <span className="stat-value">{formatBytes(sub.total_bytes)}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Unique Connections:</span>
                <span className="stat-value">{sub.unique_connections}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="dashboard-section">
        <h2>Top Destinations (Last 24 Hours)</h2>
        <div className="table-wrapper">
          <table className="top-destinations-table">
            <thead>
              <tr>
                <th>Destination</th>
                <th>Unique Subscribers</th>
                <th>Total Traffic</th>
              </tr>
            </thead>
            <tbody>
              {data.topDestinations.map((dest, idx) => (
                <tr key={idx}>
                  <td className="mac-address">{dest.second_party}</td>
                  <td className="numeric">{dest.unique_subscribers}</td>
                  <td className="numeric">{formatBytes(dest.total_bytes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="dashboard-section">
        <h2>Anomaly Summary (Last 24 Hours)</h2>
        <div className="anomaly-summary-grid">
          {data.anomalies.map((anomaly, idx) => (
            <div key={idx} className={`anomaly-summary-card severity-${anomaly.severity.toLowerCase()}`}>
              <h3>{anomaly.severity}</h3>
              <div className="anomaly-count">{anomaly.count}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default SummaryDashboard;
