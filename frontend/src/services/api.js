import axios from 'axios'

const API = axios.create({ baseURL: 'http://localhost:8000/api' })

export const registerUser = (data) => API.post('/user/register', data)
export const loginUser = (data) => API.post('/user/login', data)
export const getUser = (id) => API.get(`/user/${id}`)

export const generatePlan = (data) => API.post('/plan/generate', data)
export const getActivePlan = (userId) => API.get(`/plan/${userId}/active`)
export const completeTask = (taskId) => API.patch(`/plan/task/${taskId}/complete`)

export const getStreak = (userId) => API.get(`/streak/${userId}`)
export const updateStreak = (userId, xp) => API.post(`/streak/${userId}/update?xp_to_add=${xp}`)

export const logMood = (data) => API.post('/mood/log', data)
export const getMoodHistory = (userId) => API.get(`/mood/${userId}/history`)
export const getLatestMood = (userId) => API.get(`/mood/${userId}/latest`)

export const startSession = (data) => API.post('/session/start', data)
export const endSession = (data) => API.post('/session/end', data)
export const getSessionSummary = (userId) => API.get(`/session/${userId}/summary`)
