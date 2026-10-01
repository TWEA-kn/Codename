import {api} from "../server/api.js";
export default {
  async fetch(request, env) {
    const apiResponse = await api(request, env);
    if (apiResponse) return apiResponse;
    const response = await env.ASSETS.fetch(request);
    const acceptsHtml = request.headers.get("accept")?.includes("text/html");

    if (new URL(request.url).pathname.startsWith("/api/") || response.status !== 404 || !acceptsHtml || !["GET", "HEAD"].includes(request.method)) {
      return response;
    }

    const indexUrl = new URL(request.url);
    indexUrl.pathname = "/index.html";
    indexUrl.search = "";
    return env.ASSETS.fetch(new Request(indexUrl, request));
  },
};
