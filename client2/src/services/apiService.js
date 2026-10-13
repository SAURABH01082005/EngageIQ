/**
 * API Service
 * Centralized API client for all backend communication
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || ''

/**
 * Fetch wrapper with error handling and logging
 */
const fetchAPI = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  };

  try {
    const response = await fetch(url, defaultOptions);

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    const data =
      contentType && contentType.includes('application/json')
        ? await response.json()
        : await response.text();

    if (!response.ok) {
      const error = new Error(data.error || `API Error: ${response.statusText}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
};

/**
 * API Service Object
 */
export const apiService = {
  /**
   * Company APIs
   */
  companies: {
    findCompany: (params) =>
      fetchAPI('/api/companies/findCompany', {
        method: 'GET',
        params: new URLSearchParams(params).toString(),
      }),

    getCompanyPosts: (companyName) =>
      fetchAPI(`/api/companies/getCompanyPosts?companyName=${encodeURIComponent(companyName)}`, {
        method: 'GET',
      }),

    getCompanyAnalytics: (companyName) =>
      fetchAPI(`/api/companies/analytics?companyName=${encodeURIComponent(companyName)}`, {
        method: 'GET',
      }),
  },

  /**
   * Analytics APIs
   */
  analytics: {
    getAnalytics: (platform) =>
      fetchAPI(`/api/analytics?platform=${platform}`, {
        method: 'GET',
      }),

    getPlatformAnalytics: (platform) =>
      fetchAPI(`/api/platform-analytics?platform=${platform}`, {
        method: 'GET',
      }),

    getSentimentAnalytics: (platform) =>
      fetchAPI(`/api/sentiment-analytics?platform=${platform}`, {
        method: 'GET',
      }),
  },

  /**
   * AI & Recommendations APIs
   */
  ai: {
    queryAI: (query, platform) =>
      fetchAPI('/api/ai-query', {
        method: 'POST',
        body: JSON.stringify({ query, platform }),
      }),

    getRecommendations: (platform) =>
      fetchAPI(`/api/recommendations?platform=${platform}`, {
        method: 'GET',
      }),

    predictEngagement: (data) =>
      fetchAPI('/api/predict-engagement', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  /**
   * Report APIs
   */
  reports: {
    generateReport: (data) =>
      fetchAPI('/api/export-report', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getEngagementTimeline: (platform) =>
      fetchAPI(`/api/engagement-timeline?platform=${platform}`, {
        method: 'GET',
      }),
  },
};

/**
 * Error handler utility
 */
export const handleApiError = (error) => {
  if (error.status === 404) {
    return 'Resource not found';
  }
  if (error.status === 401) {
    return 'Unauthorized. Please login again.';
  }
  if (error.status === 403) {
    return 'Access denied';
  }
  if (error.status === 500) {
    return 'Server error. Please try again later.';
  }
  return error.message || 'An unexpected error occurred';
};

export default apiService;
