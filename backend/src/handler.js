import { parse } from "node:url";
import { authRoutes, tipRoutes } from "./routes/index.js";
import { tipService, authService } from "./services/index.js";
import { DEFAULT_HEADER } from "./util/util.js";

const allRoutes = {
  ...tipRoutes({ tipService, authService }),
  ...authRoutes({ authService }),
  default: (_, response) => {
    response.writeHead(404, DEFAULT_HEADER);
    response.write(JSON.stringify({ error: "page not found" }));
    response.end();
  },
};

function handler(request, response) {
  const { url, method } = request;

  // Handle preflight
  if (method === "OPTIONS") {
    response.writeHead(204, DEFAULT_HEADER);
    return response.end();
  }

  const { pathname } = parse(url, true);

  const key = `${pathname}:${method.toLowerCase()}`;
  const chosen = allRoutes[key] || allRoutes.default;

  return Promise.resolve(chosen(request, response)).catch(
    handlerError(response)
  );
}

function handlerError(response) {
  return (error) => {
    console.log("Something went wrong**", error.stack);
    response.writeHead(500, DEFAULT_HEADER);
    response.write(
      JSON.stringify({
        error: "internal server error",
      })
    );

    return response.end();
  };
}

export default handler;
