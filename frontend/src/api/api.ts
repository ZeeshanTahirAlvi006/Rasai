import axios ,{type AxiosInstance} from "axios"

let memoryToken: string | null = typeof window !== 'undefined' ? localStorage.getItem('ndr_access_token') : null;

export const setInMemoryToken = (token: string | null): void => {
  memoryToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('ndr_access_token', token);
    } else {
      localStorage.removeItem('ndr_access_token');
    }
  }
};

export const getMemoryToken = (): string | null => {
  return memoryToken || (typeof window !== 'undefined' ? localStorage.getItem('ndr_access_token') : null);
};

const API: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  withCredentials: true,
});

// Attach bearer token dynamically to outgoing request
API.interceptors.request.use(
  (config) => {
    const token = getMemoryToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

API.interceptors.response.use(
  (response: any) => response,
  async (error: any) => {
    // Silent refresh if 401 status and not retrieved yet
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      !originalRequest?._retry &&
      !originalRequest?.url?.includes('/refresh-token') &&
      !originalRequest?.url?.includes('/login')
    ) {
      originalRequest._retry = true;
      try {
        const res = await API.post('/auth/refresh-token');
        const newAccessToken = res.data?.data?.accessToken || res.data?.accessToken;
        if (newAccessToken) {
          setInMemoryToken(newAccessToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return API(originalRequest);
        }
      } catch (refreshError) {
        setInMemoryToken(null);
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);
export default API