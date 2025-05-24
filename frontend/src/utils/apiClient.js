import { auth } from '../firebase/config';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://api.bhaai.org.in';

class ApiClient {
  async makeRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    // Get Firebase ID token if user is authenticated
    let headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    if (auth.currentUser) {
      try {
        // Get ID token with force refresh to handle clock skew
        const idToken = await auth.currentUser.getIdToken(true);
        headers['Authorization'] = `Bearer ${idToken}`;
      } catch (tokenError) {
        console.warn('Failed to get ID token:', tokenError);
        // Continue without token for endpoints that don't require auth
      }
    }
    
    const requestOptions = {
      ...options,
      headers
    };
    
    try {
      const response = await fetch(url, requestOptions);
      
      if (response.status === 401) {
        // Token might be expired, try to refresh
        if (auth.currentUser) {
          try {
            const refreshedToken = await auth.currentUser.getIdToken(true);
            headers['Authorization'] = `Bearer ${refreshedToken}`;
            
            // Retry the request with refreshed token
            const retryResponse = await fetch(url, {
              ...requestOptions,
              headers
            });
            
            if (retryResponse.ok) {
              return await retryResponse.json();
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
          }
        }
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }
  
  async get(endpoint) {
    return this.makeRequest(endpoint, { method: 'GET' });
  }
  
  async post(endpoint, data) {
    return this.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  
  async put(endpoint, data) {
    return this.makeRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
  
  async delete(endpoint) {
    return this.makeRequest(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
export default apiClient;
