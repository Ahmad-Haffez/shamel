import React, { useState } from 'react';
import './SearchForm.css';

function SearchForm({ onSearch, loading }) {
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [subscriberId, setSubscriberId] = useState('');
  const [publicIP, setPublicIP] = useState('');
  const [privateIP, setPrivateIP] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const searchParams = {
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      subscriberId: subscriberId.trim() || undefined,
      publicIP: publicIP.trim() || undefined,
      privateIP: privateIP.trim() || undefined,
    };

    // At least one search parameter is required
    const hasParams = Object.values(searchParams).some(v => v !== undefined);
    if (!hasParams) {
      alert('Please enter at least one search parameter');
      return;
    }

    onSearch(searchParams);
  };

  const handleReset = () => {
    setStartTime('');
    setEndTime('');
    setSubscriberId('');
    setPublicIP('');
    setPrivateIP('');
  };

  return (
    <form className="search-form" onSubmit={handleSubmit}>
      <div className="form-section">
        <h3>Time Range</h3>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="startTime">Start Time</label>
            <input
              type="datetime-local"
              id="startTime"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="endTime">End Time</label>
            <input
              type="datetime-local"
              id="endTime"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Search Filters</h3>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="subscriberId">Subscriber ID (MSISDN)</label>
            <input
              type="text"
              id="subscriberId"
              placeholder="Enter subscriber ID"
              value={subscriberId}
              onChange={(e) => setSubscriberId(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="publicIP">Public IP</label>
            <input
              type="text"
              id="publicIP"
              placeholder="e.g., 192.168.1.1"
              value={publicIP}
              onChange={(e) => setPublicIP(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="privateIP">Private IP</label>
            <input
              type="text"
              id="privateIP"
              placeholder="e.g., 10.0.0.1"
              value={privateIP}
              onChange={(e) => setPrivateIP(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={handleReset} disabled={loading}>
          Reset
        </button>
      </div>
    </form>
  );
}

export default SearchForm;
