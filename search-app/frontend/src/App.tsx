import React, { useState, useEffect } from 'react';
import './App.css';
import StatsSearchForm from './components/StatsSearchForm';
import StatsTable from './components/StatsTable';
import AnomalyTable from './components/AnomalyTable';
import SummaryDashboard from './components/SummaryDashboard';
import {
  getSubscriberStats,
  getGlobalStats,
  getAnomalies,
  getSubscriberSummary,
  getTopDestinations,
  getAnomalySummary
} from './services/clickhouseService';
import { SearchParams, DashboardData, SubscriberStats, GlobalStats, TrafficAnomaly } from './types';

type ViewType = 'subscriber' | 'global' | 'anomalies' | 'dashboard';

function App() {
  const [view, setView] = useState<ViewType>('dashboard');
  const [results, setResults] = useState<SubscriberStats[] | GlobalStats[] | TrafficAnomaly[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalRows, setTotalRows] = useState(0);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const [summary, topDest, anomalySummary] = await Promise.all([
        getSubscriberSummary(24),
        getTopDestinations({ hours: 24, limit: 10 }),
        getAnomalySummary(24)
      ]);

      setDashboardData({
        subscribers: summary.data,
        topDestinations: topDest.data,
        anomalies: anomalySummary.data
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'dashboard') {
      loadDashboard();
    }
  }, [view]);

  const handleSearch = async (searchParams: SearchParams) => {
    setLoading(true);
    setError(null);

    try {
      let response;
      if (view === 'subscriber') {
        response = await getSubscriberStats(searchParams);
      } else if (view === 'global') {
        response = await getGlobalStats(searchParams);
      } else if (view === 'anomalies') {
        response = await getAnomalies(searchParams);
      }

      if (response) {
        setResults(response.data);
        setTotalRows(response.rows);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search');
      setResults([]);
      setTotalRows(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>WiFi Traffic Analytics</h1>
        <p>Real-time network statistics and anomaly detection</p>
      </header>

      <nav className="view-selector">
        <button
          className={view === 'dashboard' ? 'active' : ''}
          onClick={() => setView('dashboard')}
        >
          Dashboard
        </button>
        <button
          className={view === 'subscriber' ? 'active' : ''}
          onClick={() => setView('subscriber')}
        >
          Subscriber Stats
        </button>
        <button
          className={view === 'global' ? 'active' : ''}
          onClick={() => setView('global')}
        >
          Global Stats
        </button>
        <button
          className={view === 'anomalies' ? 'active' : ''}
          onClick={() => setView('anomalies')}
        >
          Anomalies
        </button>
      </nav>

      <main className="App-main">
        {view === 'dashboard' ? (
          loading ? (
            <div className="loading-spinner">
              <div className="spinner"></div>
              <p>Loading dashboard...</p>
            </div>
          ) : error ? (
            <div className="error-message">
              <strong>Error:</strong> {error}
            </div>
          ) : dashboardData ? (
            <SummaryDashboard data={dashboardData} />
          ) : null
        ) : (
          <>
            <StatsSearchForm
              onSearch={handleSearch}
              loading={loading}
              view={view}
            />

            {error && (
              <div className="error-message">
                <strong>Error:</strong> {error}
              </div>
            )}

            {loading && (
              <div className="loading-spinner">
                <div className="spinner"></div>
                <p>Searching...</p>
              </div>
            )}

            {!loading && results.length > 0 && (
              view === 'anomalies' ? (
                <AnomalyTable results={results as TrafficAnomaly[]} totalRows={totalRows} />
              ) : (
                <StatsTable results={results as SubscriberStats[] | GlobalStats[]} totalRows={totalRows} view={view} />
              )
            )}

            {!loading && !error && results.length === 0 && totalRows === 0 && (
              <div className="no-results">
                <p>No results found. Try adjusting your search criteria.</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
