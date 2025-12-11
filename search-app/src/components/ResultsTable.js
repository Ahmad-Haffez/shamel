import React from 'react';
import './ResultsTable.css';

function ResultsTable({ results, totalHits }) {
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="results-container">
      <div className="results-header">
        <h2>Search Results</h2>
        <span className="results-count">Total: {totalHits} records</span>
      </div>

      <div className="table-wrapper">
        <table className="results-table">
          <thead>
            <tr>
              <th>Subscriber ID</th>
              <th>Public IP</th>
              <th>Private IP</th>
              <th>Private Port</th>
              <th>Public Port</th>
              <th>Protocol</th>
              <th>NAT Event</th>
              <th>Destination IP</th>
              <th>Destination Port</th>
              <th>Duration (s)</th>
              <th>Login Time</th>
              <th>CGNAT Time</th>
            </tr>
          </thead>
          <tbody>
            {results.map((record, index) => (
              <tr key={index}>
                <td className="subscriber-id">{record.subscriberID || 'N/A'}</td>
                <td className="ip-address">{record.publicIP || 'N/A'}</td>
                <td className="ip-address">{record.privateIP || 'N/A'}</td>
                <td>{record.privatePort || 'N/A'}</td>
                <td>{record.publicPort || 'N/A'}</td>
                <td className="protocol">{record.protocol || 'N/A'}</td>
                <td className="nat-event">{record.natEvent || 'N/A'}</td>
                <td className="ip-address">{record.destinationIP || 'N/A'}</td>
                <td>{record.destinationPort || 'N/A'}</td>
                <td>{record.duration || 0}</td>
                <td className="timestamp">{formatTimestamp(record.loginTime)}</td>
                <td className="timestamp">{formatTimestamp(record.cgnatTime)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {results.length < totalHits && (
        <div className="results-footer">
          <p>Showing {results.length} of {totalHits} results</p>
        </div>
      )}
    </div>
  );
}

export default ResultsTable;
