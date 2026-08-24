import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getHealth = async () => {
  const res = await api.get('/health');
  return res.data;
};

export const getSchedule = async (versionId, filters = {}) => {
  const params = new URLSearchParams();
  if (filters.day) params.append('day', filters.day);
  if (filters.room_id) params.append('room_id', filters.room_id);
  if (filters.student_id) params.append('student_id', filters.student_id);
  if (filters.company_id) params.append('company_id', filters.company_id);

  if (versionId) {
    const res = await api.get(`/schedules/${versionId}?${params.toString()}`);
    return res.data;
  } else {
    const res = await api.get(`/schedule?${params.toString()}`);
    return res.data;
  }
};

export const getScheduleMetrics = async (versionId) => {
  if (versionId) {
    const res = await api.get(`/schedules/${versionId}/metrics`);
    return res.data;
  }
  const res = await api.get('/metrics');
  return res.data;
};

export const getReplanMetrics = async (proposalId) => {
  const res = await api.get(`/replans/${proposalId}/metrics`);
  return res.data;
};

export const triggerReplan = async (payload) => {
  const res = await api.post('/replans/generate', payload);
  return res.data;
};

export const approveReplan = async (proposalId) => {
  const res = await api.post(`/replans/${proposalId}/approve`);
  return res.data;
};

export const rejectReplan = async (proposalId) => {
  const res = await api.post(`/replans/${proposalId}/reject`);
  return res.data;
};

export const resetSchedule = async () => {
  const res = await api.post('/schedule/reset');
  return res.data;
};

export const getCompanies = async (params = {}) => {
  const res = await api.get('/companies', { params });
  return res.data;
};

export const getRooms = async () => {
  const res = await api.get('/rooms');
  return res.data;
};

export const getStudents = async (params = {}) => {
  const res = await api.get('/students', { params });
  return res.data;
};

export const getNotifications = async (params = {}) => {
  const res = await api.get('/notifications', { params });
  return res.data;
};

export default api;
