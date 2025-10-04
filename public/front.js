window.api = {
	async request(path, method = 'GET', body) {
		const opts = { method, headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin' };
		if (body) opts.body = JSON.stringify(body);
		const res = await fetch(path, opts);
		let data = null;
		try { data = await res.json(); } catch (e) { /* ignore */ }
		return data || { ok: false, error: 'invalid response' };
	},
	me() { return this.request('/api/me'); },
	login(username, password) { return this.request('/api/login', 'POST', { username, password }); },
	signup(username, password) { return this.request('/api/signup', 'POST', { username, password }); },
	logout() { return this.request('/api/logout', 'POST'); },
	duplCheck(username) { return this.request(`/api/dupl_check?username=${encodeURIComponent(username)}`); },
};
