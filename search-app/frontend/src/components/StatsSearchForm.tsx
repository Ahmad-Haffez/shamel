import React, { useState } from 'react';
import { SearchParams } from '../types';
import './StatsSearchForm.css';

interface StatsSearchFormProps {
  onSearch: (params: SearchParams) => void;
  loading: boolean;
  view: 'subscriber' | 'global' | 'anomalies';
}

const StatsSearchForm: React.FC<StatsSearchFormProps> = ({ onSearch, loading, view }) => {
  const [hours, setHours] = useState<number>(1);
  const [subscriber, setSubscriber] = useState<string>('');
  const [severity, setSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | ''>('');
  const [limit, setLimit] = useState<number>(100);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const params: SearchParams = {
      hours,
      limit
    };

    if (subscriber.trim()) {
      params.subscriber = subscriber.trim();
    }

    if (severity) {
      params.severity = severity;
    }

    onSearch(params);
  };

  return (
    <div className="stats-search-form">
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="hours">Time Range (hours):</label>
            <input
              type="number"
              id="hours"
              min="1"
              max="168"
              value={hours}
              onChange={(e) => setHours(parseInt(e.target.value) || 1)}
              disabled={loading}
            />
          </div>

          {view === 'subscriber' && (
            <div className="form-group">
              <label htmlFor="subscriber">Subscriber (optional):</label>
              <input
                type="text"
                id="subscriber"
                placeholder="MAC address filter"
                value={subscriber}
                onChange={(e) => setSubscriber(e.target.value)}
                disabled={loading}
              />
            </div>
          )}

          {view === 'anomalies' && (
            <div className="form-group">
              <label htmlFor="severity">Severity:</label>
              <select
                id="severity"
                value={severity}
                onChange={(e) => setSeverity(e.target.value as any)}
                disabled={loading}
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
            <input
              type="number"
              id="limit"
              min="10"
              max="1000"
              step="10"
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value) || 100)}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <button type="submit" disabled={loading} className="search-button">
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default StatsSearchForm;
