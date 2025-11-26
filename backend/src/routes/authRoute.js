import { once } from "node:events";
import { DEFAULT_HEADER } from "../util/util.js";

const authRoutes = ({ authService }) => ({
  "/auth/register:post": async (request, response) => {
    const [rawBody] = await once(request, "data");
    const body = JSON.parse(rawBody || "{}");

    const { username, password, profilePicture } = body;

    if (!username || !password) {
      response.writeHead(400, DEFAULT_HEADER);
      return response.end(
        JSON.stringify({ error: "username and password are required" })
      );
    }

    try {
      const user = await authService.register({
        username,
        password,
        profilePicture,
      });

      response.writeHead(201, DEFAULT_HEADER);
      return response.end(JSON.stringify({ user }));
    } catch (err) {
      response.writeHead(err.statusCode || 500, DEFAULT_HEADER);
      return response.end(JSON.stringify({ error: err.message }));
    }
  },

  "/auth/login:post": async (request, response) => {
    const [rawBody] = await once(request, "data");
    const body = JSON.parse(rawBody || "{}");

    const { username, password } = body;

    if (!username || !password) {
      response.writeHead(400, DEFAULT_HEADER);
      return response.end(
        JSON.stringify({ error: "username and password are required" })
      );
    }

    try {
      const { token, user } = await authService.login({
        username,
        password,
      });

      response.writeHead(200, DEFAULT_HEADER);
      return response.end(JSON.stringify({ token, user }));
    } catch (err) {
      response.writeHead(err.statusCode || 500, DEFAULT_HEADER);
      return response.end(JSON.stringify({ error: err.message }));
    }
  },
});

export default authRoutes;
