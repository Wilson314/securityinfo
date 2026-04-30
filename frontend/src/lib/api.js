import axios from 'axios'

const api = axios.create({ baseURL: '/api', timeout: 15000 })

// Events
export const getEvents = (params) => api.get('/events', { params })
export const getEvent = (id) => api.get(`/events/${id}`)
export const createEvent = (data) => api.post('/events', data)
export const updateEvent = (id, data) => api.put(`/events/${id}`, data)
export const deleteEvent = (id) => api.delete(`/events/${id}`)

// Stats
export const getSummary = (params) => api.get('/stats/summary', { params })
export const getCharts = (params) => api.get('/stats/charts', { params })

// Export
export const exportCSV = (params) => {
  const qs = new URLSearchParams(params).toString()
  window.open(`/api/export/csv${qs ? '?' + qs : ''}`, '_blank')
}
export const exportExcel = (params) => {
  const qs = new URLSearchParams(params).toString()
  window.open(`/api/export/excel${qs ? '?' + qs : ''}`, '_blank')
}
export const exportTxt = (params) => {
  const qs = new URLSearchParams(params).toString()
  window.open(`/api/export/report-summary${qs ? '?' + qs : ''}`, '_blank')
}
export const getReportPreview = (params) => api.get('/export/report-preview', { params })

// Google
export const googleExport = (gasUrl) => api.post('/google/export', { gasUrl })
export const googleImport = (gasUrl) => api.post('/google/import', { gasUrl })
export const googleTest = (gasUrl) => api.post('/google/test', { gasUrl })

export default api
