export function errorHandler(err, req, res, next) {
  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);

  const statusCode = err.statusCode || (err.code === "DEVICE_LIMIT_REACHED" ? 403 : 400);

  res.status(statusCode).json({
    success: false,
    message: err.message || "An unexpected error occurred",
    code: err.code || "INTERNAL_ERROR"
  });
}

