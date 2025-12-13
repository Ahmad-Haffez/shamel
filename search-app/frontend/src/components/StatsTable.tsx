import React from 'react';
import { SubscriberStats, GlobalStats } from '../types';
import './StatsTable.css';

interface StatsTableProps {
  results: SubscriberStats[] | GlobalStats[];
  totalRows: number;
  view: 'subscriber' | 'global';
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

const StatsTable: React.FC<StatsTableProps> = ({ results, totalRows, view }) => {
  const isSubscriberView = view === 'subscriber';

  return (
    <div className="stats-table-container">
      <div className="results-info">
        <p>Showing {results.length} of {totalRows} records</p>
      </div>
      
      <div className="table-wrapper">
        <table className="stats-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              {isSubscriberView && (
                <>
                  <th>Subscriber</th>
                  <th>Second Party</th>
                </>
              )}
              <th>Bytes</th>
              <th>Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {results.map((row, idx) => (
              <tr key={idx}>
                <td>{formatTimestamp(row.timestamp)}</td>
                {isSubscriberView && (
                  <>
                    <td className="mac-address">{(row as SubscriberStats).subscriber}</td>
                    <td className="mac-address">{(row as SubscriberStats).second_party}</td>
                  </>
                )}
                <td className="numeric">{formatBytes(row.bytes)}</td>
                <td className="timestamp">{new Date(row.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StatsTable;
