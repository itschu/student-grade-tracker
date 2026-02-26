import axios from 'axios';
import { performLogout } from '../contexts/AuthContext';

const client = axios.create({
	baseURL: 'http://localhost:5000',
});

// request interceptor for auth header
client.interceptors.request.use((config) => {
	const auth = localStorage.getItem('auth');
	if (auth) {
		try {
			const parsed = JSON.parse(auth);
			if (parsed && parsed.token) {
				config.headers = config.headers || {};
				config.headers.Authorization = `Bearer ${parsed.token}`;
			}
		} catch (_e) {
			// ignore invalid JSON
		}
	}
	return config;
});

// response interceptor for 401
client.interceptors.response.use(
	(resp) => resp,
	(err) => {
		if (err.response && err.response.status === 401) {
			// defer to shared logout routine which also handles redirect
			performLogout();
		}
		return Promise.reject(err);
	},
);

export default client;
