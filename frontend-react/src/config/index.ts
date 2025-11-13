const Config = {
  AUTH_BASE_URL: import.meta.env.VITE_AUTH_BASE_URL || 'http://localhost:8000',
  ROOMS_BASE_URL: import.meta.env.VITE_ROOMS_BASE_URL || 'http://localhost:3000/API/v1',
};

export default Config;
