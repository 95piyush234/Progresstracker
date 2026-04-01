import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { verifyAccessToken } from "../utils/token.utils.js";

function extractBearerToken(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    return "";
  }

  return header.slice(7).trim();
}

export async function requireAuth(req, _res, next) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      throw new ApiError(401, "Authentication token is missing.");
    }

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub);
    if (!user) {
      throw new ApiError(401, "The authenticated user no longer exists.");
    }

    req.user = user;
    req.auth = payload;
    req.accessToken = token;
    next();
  } catch (error) {
    next(error.statusCode ? error : new ApiError(401, "Authentication failed."));
  }
}

export function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      next(new ApiError(401, "Authentication is required."));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new ApiError(403, "You do not have permission to access this resource."));
      return;
    }

    next();
  };
}
