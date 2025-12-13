import React from 'react';
import './StatsTable.css';

function StatsTable({ results, totalRows, view }) {
  const formatBytes = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="results-container">
      <div className="results-header">
        <h2>Results ({totalRows} rows)</h2>
      </div>
      
      <div className="table-wrapper">
        <table className="results-table">
          <thead>
            <tr>
              {view === 'subscriber' ? (
                <>
                  <th>Timestamp</th>
                  <th>Subscriber</th>
                  <th>Second Party</th>
                  <th>Bytes</th>
                  <th>Last Seen</th>
                </>
              ) : (
                <>
                  <th>Timestamp</th>
                  <th>Second Party</th>
                  <th>Packets</th>
                  <th>Bytes</th>
                  <th>Last Seen</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {results.map((row, index) => (
              <tr key={index}>
                {view === 'subscriber' ? (
                  <>
                    <td>{formatTimestamp(row.timestamp)}</td>
                    <td><strong>{row.subscriber}</strong></td>
                    <td>{row.second_party}</td>
                    <td>{formatBytes(row.bytes)}</td>
                    <td>{formatTimestamp(row.last_seen)}</td>
                  </>
                ) : (
                  <>
                    <td>{formatTimestamp(row.timestamp)}</td>
                    <td>{row.second_party}</td>
                    <td>{row.packets.toLocaleString()}</td>
                    <td>{formatBytes(row.bytes)}</td>
                    <td>{formatTimestamp(row.last_seen)}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default StatsTable;
