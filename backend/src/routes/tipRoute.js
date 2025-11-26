import { once } from "node:events";
import { DEFAULT_HEADER, getUserFromRequest } from "../util/util.js";
import { readDb } from "../../database/database.js";

function tipRoutes({ tipService, authService }) {
  return {
    "/tips:get": async (req, res) => {
      const user = getUserFromRequest(req, res);
      if (!user) return;

      const db = await readDb();

      const enrichedTips = db.tips.map((tip) => {
        const tipUser = db.users.find((u) => u.id === tip.userId);
        return {
          id: tip.id,
          title: tip.title,
          userId: tip.userId,
          username: tipUser?.username || "Unknown",
          profilePicture: tipUser?.profilePicture || "",
        };
      });

      res.writeHead(200, DEFAULT_HEADER);
      return res.end(
        JSON.stringify({
          results: enrichedTips,
          currentUserId: user.userId,
        })
      );
    },

    "/tips:post": async (req, res) => {
      const user = getUserFromRequest(req, res);
      if (!user) return;

      const [rawBody] = await once(req, "data");
      const body = JSON.parse(rawBody || "{}");
      const { title } = body;

      if (!title) {
        res.writeHead(400, DEFAULT_HEADER);
        return res.end(JSON.stringify({ error: "title is required" }));
      }

      const id = await tipService.create({
        title,
        userId: user.userId,
      });

      res.writeHead(201, DEFAULT_HEADER);
      return res.end(
        JSON.stringify({
          id,
          success: "Tip created successfully",
        })
      );
    },

    "/tips:put": async (req, res) => {
      const user = getUserFromRequest(req, res);
      if (!user) return;

      const [rawBody] = await once(req, "data");
      const body = JSON.parse(rawBody || "{}");
      const { id, title } = body;

      if (!id || !title) {
        res.writeHead(400, DEFAULT_HEADER);
        return res.end(JSON.stringify({ error: "id and title are required" }));
      }

      const ok = await tipService.update({
        id,
        title,
        userId: user.userId,
      });

      if (!ok) {
        res.writeHead(404, DEFAULT_HEADER);
        return res.end(JSON.stringify({ error: "Tip not found or not yours" }));
      }

      res.writeHead(200, DEFAULT_HEADER);
      return res.end(JSON.stringify({ success: "Tip updated successfully" }));
    },

    "/tips:delete": async (req, res) => {
      const user = getUserFromRequest(req, res);
      if (!user) return;

      const [rawBody] = await once(req, "data");
      const body = JSON.parse(rawBody || "{}");
      const { id } = body;

      if (!id) {
        res.writeHead(400, DEFAULT_HEADER);
        return res.end(JSON.stringify({ error: "id is required" }));
      }

      const ok = await tipService.remove({
        id,
        userId: user.userId,
      });

      if (!ok) {
        res.writeHead(404, DEFAULT_HEADER);
        return res.end(JSON.stringify({ error: "Tip not found or not yours" }));
      }

      res.writeHead(200, DEFAULT_HEADER);
      return res.end(JSON.stringify({ success: "Tip deleted successfully" }));
    },
  };
}

export default tipRoutes;
