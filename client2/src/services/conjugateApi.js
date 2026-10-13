/**
 * Conjugate Media Client API Service
 * 
 * Interacts with the independent Conjugate Media server (Port 5002)
 * for platform controls, post management, and live metric modulation.
 */

const BASE_URL = '/conjugate-api';

const handleResponse = async (res) => {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Conjugate Media API Error');
  }
  return data;
};

export const conjugateApi = {
  /**
   * Get all platform channel profiles and subscriber counts
   */
  getChannels: async (userId = 'default_user') => {
    const res = await fetch(`${BASE_URL}/platforms?userId=${userId}`, {
      headers: { 'x-user-id': userId }
    });
    return handleResponse(res);
  },

  /**
   * Modulate channel subscribers / followers count
   */
  updateSubscribers: async (platform, delta, subscribers, userId = 'default_user') => {
    const res = await fetch(`${BASE_URL}/platforms/${platform}/subscribers`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId
      },
      body: JSON.stringify({ delta, subscribers, userId })
    });
    return handleResponse(res);
  },

  /**
   * Get all posts with optional filtering
   */
  getPosts: async (filter = {}, userId = 'default_user') => {
    const params = new URLSearchParams({ userId, ...filter });
    const res = await fetch(`${BASE_URL}/posts?${params.toString()}`, {
      headers: { 'x-user-id': userId }
    });
    return handleResponse(res);
  },

  /**
   * Create a new post
   */
  createPost: async (postData, userId = 'default_user') => {
    const res = await fetch(`${BASE_URL}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId
      },
      body: JSON.stringify({ ...postData, userId })
    });
    return handleResponse(res);
  },

  /**
   * Modulate post metrics (likes, comments, shares, dislikes, reach, views)
   */
  updatePostMetrics: async (postId, updates, userId = 'default_user') => {
    const res = await fetch(`${BASE_URL}/posts/${postId}/metrics`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId
      },
      body: JSON.stringify({ ...updates, userId })
    });
    return handleResponse(res);
  },

  /**
   * Add a comment to a post
   */
  addComment: async (postId, commentData, userId = 'default_user') => {
    const res = await fetch(`${BASE_URL}/posts/${postId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId
      },
      body: JSON.stringify({ ...commentData, userId })
    });
    return handleResponse(res);
  },

  /**
   * Modify post timeline / date
   */
  updatePostTimeline: async (postId, timestamp, userId = 'default_user') => {
    const res = await fetch(`${BASE_URL}/posts/${postId}/timeline`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId
      },
      body: JSON.stringify({ timestamp, userId })
    });
    return handleResponse(res);
  },

  /**
   * Delete post
   */
  deletePost: async (postId, userId = 'default_user') => {
    const res = await fetch(`${BASE_URL}/posts/${postId}?userId=${userId}`, {
      method: 'DELETE',
      headers: { 'x-user-id': userId }
    });
    return handleResponse(res);
  },

  /**
   * Reset sandbox
   */
  resetSandbox: async (userId = 'default_user') => {
    const res = await fetch(`${BASE_URL}/reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId
      },
      body: JSON.stringify({ userId })
    });
    return handleResponse(res);
  }
};

export default conjugateApi;
