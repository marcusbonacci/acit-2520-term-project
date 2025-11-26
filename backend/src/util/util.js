import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../services/authService.js";

const DEFAULT_HEADER = {
  "content-type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
};

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function getUserFromRequest(req, res, next) {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.writeHead(401, DEFAULT_HEADER);
    res.end(
      JSON.stringify({ error: "Missing or invalid Authorization header" })
    );
    return null;
  }

  const token = authHeader.slice("Bearer ".length);
  const payload = verifyToken(token);

  if (!payload) {
    res.writeHead(401, DEFAULT_HEADER);
    res.end(JSON.stringify({ error: "Invalid token" }));
    return null;
  }

  return payload;
}

export { DEFAULT_HEADER, getUserFromRequest };
