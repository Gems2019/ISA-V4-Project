
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://myWebAPIServer.ca', // Your backend server address!
});

// Interceptor: Runs BEFORE each request is sent
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token'); // Get token from storage
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;