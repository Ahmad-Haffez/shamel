import axios from 'axios';
import {
  SubscriberStats,
  GlobalStats,
  TrafficAnomaly,
  SubscriberSummary,
  TopDestination,
  AnomalySummary,
  SearchParams
} from '../types';

// Backend API configuration - use relative path for production
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Include cookies for authentication
  headers: {
    'Content-Type': 'application/json'
  }
});

interface ApiResponse<T> {
  data: T[];
  rows: number;
}

export const getSubscriberStats = async (params: SearchParams = {}): Promise<ApiResponse<SubscriberStats>> => {
  const response = await apiClient.get<ApiResponse<SubscriberStats>>('/subscriber-stats', { params });
  return response.data;
};

export const getGlobalStats = async (params: SearchParams = {}): Promise<ApiResponse<GlobalStats>> => {
  const response = await apiClient.get<ApiResponse<GlobalStats>>('/global-stats', { params });
  return response.data;
};

export const getAnomalies = async (params: SearchParams = {}): Promise<ApiResponse<TrafficAnomaly>> => {
  const response = await apiClient.get<ApiResponse<TrafficAnomaly>>('/anomalies', { params });
  return response.data;
};

export const getSubscriberSummary = async (hours: number = 24): Promise<ApiResponse<SubscriberSummary>> => {
  const response = await apiClient.get<ApiResponse<SubscriberSummary>>('/subscriber-summary', { params: { hours } });
  return response.data;
};

export const getTopDestinations = async (params: SearchParams = {}): Promise<ApiResponse<TopDestination>> => {
  const response = await apiClient.get<ApiResponse<TopDestination>>('/top-destinations', { params });
  return response.data;
};

export const getAnomalySummary = async (hours: number = 24): Promise<ApiResponse<AnomalySummary>> => {
  const response = await apiClient.get<ApiResponse<AnomalySummary>>('/anomaly-summary', { params: { hours } });
  return response.data;
};
