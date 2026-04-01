import { buildOverviewAnalytics } from "../services/analytics.service.js";
import { sendSuccess } from "../utils/response.js";

export async function getOverview(req, res) {
  const days = Number(req.query.days) || 30;
  const analytics = await buildOverviewAnalytics(req.user._id, days);

  sendSuccess(res, {
    message: "Analytics loaded.",
    data: analytics
  });
}
