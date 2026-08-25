export function allowedOrigins() {
  const configured = String(process.env.FRONTEND_URL || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return new Set(["http://localhost:5173", "http://localhost:3000", "https://salih-ai-one.vercel.app", ...configured]);
}

export function createCorsOptions() {
  const origins = allowedOrigins();
  return {
    origin(origin, callback) {
      if (!origin || origins.has(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type", "X-Channel", "X-Assistant-Id", "X-Hub-Signature-256", "X-Twilio-Signature"],
    maxAge: 86_400
  };
}

export function securityHeaders(_req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  return next();
}

export function sanitizeServerErrors(_req, res, next) {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 500 && body && typeof body === "object") {
      const safeBody = { ...body, error: "server_error" };
      delete safeBody.message;
      return originalJson(safeBody);
    }
    return originalJson(body);
  };
  return next();
}
