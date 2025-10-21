// 쿠키 설정 함수 (Set-Cookie 헤더 직접 구현)
function setCookie(res, name, value, options = {}) {
	let cookieStr = `${name}=${encodeURIComponent(value)}`;
	if (options.httpOnly) cookieStr += '; HttpOnly';
	if (options.sameSite) cookieStr += `; SameSite=${options.sameSite}`;
	if (options.path) cookieStr += `; Path=${options.path}`;
	if (options.maxAge) cookieStr += `; Max-Age=${options.maxAge}`;
	res.appendHeader = res.appendHeader || function(header, value) {
		const prev = this.getHeader(header);
		if (prev) {
			this.setHeader(header, Array.isArray(prev) ? prev.concat(value) : [prev, value]);
		} else {
			this.setHeader(header, value);
		}
	};
	res.appendHeader('Set-Cookie', cookieStr);
}


// 쿠키 파싱 미들웨어 (직접 구현)
function parseCookies(req, res, next) {
	const cookieHeader = req.headers.cookie;
	req.cookies = {};
	if (cookieHeader) {
		const cookies = cookieHeader.split(';');
		cookies.forEach(cookie => {
			const [name, ...rest] = cookie.trim().split('=');
			const value = rest.join('=');
			req.cookies[name] = decodeURIComponent(value);
		});
	}
	if (req.cookies.token) {
		return req.cookies.token;
	}
	return null;
}
module.exports = { setCookie, parseCookies };
