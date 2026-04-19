const normalize = (url) => url?.replace(/\/+$/, '');

const API_BASE_URL = normalize(import.meta.env.VITE_API_BASE_URL);
const CDN_BASE_URL = normalize(import.meta.env.VITE_CDN_BASE_URL);

if (!API_BASE_URL) {
  throw new Error("VITE_API_BASE_URL is not defined");
}

export { API_BASE_URL, CDN_BASE_URL };
