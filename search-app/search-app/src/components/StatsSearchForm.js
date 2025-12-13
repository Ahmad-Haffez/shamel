import React, { useState } from 'react';
import './StatsSearchForm.css';

function StatsSearchForm({ onSearch, loading, view }) {
  const [subscriber, setSubscriber] = useState('');
  const [severity, setSeverity] = useState('');
  const [hours, setHours] = useState('24');
  const [limit, setLimit] = useState('100');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const params = {
      hours: parseInt(hours),
      limit: parseInt(limit)
    };
    
    if (subscriber.trim()) {
      params.subscriber = subscriber.trim();
    }
    
    if (view === 'anomalies' && severity) {
      params.severity = severity;
    }
    
    onSearch(params);
  };

  return (
    <form className="search-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="hours">Time Range (hours):</label>
          <select 
            id="hours" 
            value={hours} 
            onChange={(e) => setHours(e.target.value)}
          >
            <option value="1">Last Hour</option>
            <option value="6">Last 6 Hours</option>
            <option value="24">Last 24 Hours</option>
            <option value="168">Last Week</option>
          </select>
        </div>

        {(view === 'subscriber' || view === 'anomalies') && (
          <div className="form-group">
            <label htmlFor="subscriber">Subscriber (optional):</label>
            <input
              type="text"
              id="subscriber"
              value={subscriber}
              onChange={(e) => setSubscriber(e.target.value)}
              placeholder="e.g., TV1, hPhone"
            />
          </div>
        )}

        {view === 'anomalies' && (
          <div className="form-group">
            <label htmlFor="severity">Severity:</label>
            <select 
              id="severity" 
              value={severity} 
              onChange={(e) => setSeverity(e.target.value)}
            >
              <option value="">All</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="limit">Results Limit:</label>
          <select 
            id="limit" 
            value={limit} 
            onChange={(e) => setLimit(e.target.value)}
          >
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="500">500</option>
            <option value="1000">1000</option>
          </select>
        </div>

        <div className="form-group">
          <button type="submit" disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>
    </form>
  );
}

export default StatsSearchForm;
