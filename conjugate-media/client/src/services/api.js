/**
 * Conjugate Media Client API
 */

const BASE_URL = '/api';

const handleResponse = async (res) => {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Conjugate Media API Error');
  }
  return data;
};

export const api = {
  getChannels: async (userEmail = 'default_user') => {
    const res = await fetch(`${BASE_URL}/platforms?userEmail=${encodeURIComponent(userEmail)}`, {
      headers: { 'x-user-email': userEmail }
    });
    return handleResponse(res);
  },

  updateSubscribers: async (platform, delta, subscribers, userEmail = 'default_user') => {
    const res = await fetch(`${BASE_URL}/platforms/${platform}/subscribers`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': userEmail
      },
      body: JSON.stringify({ delta, subscribers, userEmail })
    });
    return handleResponse(res);
  },

  getPosts: async (filter = {}, userEmail = 'default_user') => {
    const params = new URLSearchParams({ userEmail, ...filter });
    const res = await fetch(`${BASE_URL}/posts?${params.toString()}`, {
      headers: { 'x-user-email': userEmail }
    });
    return handleResponse(res);
  },

  createPost: async (postData, userEmail = 'default_user') => {
    const res = await fetch(`${BASE_URL}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': userEmail
      },
      body: JSON.stringify({ ...postData, userEmail })
    });
    return handleResponse(res);
  },

  updatePostMetrics: async (postId, updates, userEmail = 'default_user') => {
    const res = await fetch(`${BASE_URL}/posts/${postId}/metrics`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': userEmail
      },
      body: JSON.stringify({ ...updates, userEmail })
    });
    return handleResponse(res);
  },

  addComment: async (postId, commentData, userEmail = 'default_user') => {
    const res = await fetch(`${BASE_URL}/posts/${postId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': userEmail
      },
      body: JSON.stringify({ ...commentData, userEmail })
    });
    return handleResponse(res);
  },

  deletePost: async (postId, userEmail = 'default_user') => {
    const res = await fetch(`${BASE_URL}/posts/${postId}?userEmail=${encodeURIComponent(userEmail)}`, {
      method: 'DELETE',
      headers: { 'x-user-email': userEmail }
    });
    return handleResponse(res);
  },

  resetSandbox: async (userEmail = 'default_user') => {
    const res = await fetch(`${BASE_URL}/reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': userEmail
      },
      body: JSON.stringify({ userEmail })
    });
    return handleResponse(res);
  },

  checkUser: async (userEmail) => {
    const res = await fetch(`${BASE_URL}/users/check?email=${encodeURIComponent(userEmail)}`, {
      headers: { 'x-user-email': userEmail }
    });
    return handleResponse(res);
  },

  registerUser: async (userEmail, extraData = {}) => {
    const res = await fetch(`${BASE_URL}/users/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': userEmail
      },
      body: JSON.stringify({ email: userEmail, ...extraData })
    });
    return handleResponse(res);
  },

  // ==========================================
  // TRENDING DATASET API CONTROLS
  // ==========================================
  getTrending: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const res = await fetch(`${BASE_URL}/trending?${params.toString()}`);
    return handleResponse(res);
  },

  getTrendingSummary: async () => {
    const res = await fetch(`${BASE_URL}/trending/summary`);
    return handleResponse(res);
  },

  getTrendingItem: async (id) => {
    const res = await fetch(`${BASE_URL}/trending/${encodeURIComponent(id)}`);
    return handleResponse(res);
  },

  createTrendingItem: async (itemData) => {
    const res = await fetch(`${BASE_URL}/trending`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(itemData)
    });
    return handleResponse(res);
  },

  updateTrendingMetrics: async (id, updates) => {
    const res = await fetch(`${BASE_URL}/trending/${encodeURIComponent(id)}/metrics`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return handleResponse(res);
  },

  updateTrendingItem: async (id, formUpdates) => {
    const res = await fetch(`${BASE_URL}/trending/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formUpdates)
    });
    return handleResponse(res);
  },

  deleteTrendingItem: async (id) => {
    const res = await fetch(`${BASE_URL}/trending/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return handleResponse(res);
  }
};

export default api;
