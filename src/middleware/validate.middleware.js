export function validateBody(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error.issues) {
        const errorMessages = error.issues.map(
          (issue) => `${issue.path.join(".") || "field"}: ${issue.message}`
        );
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: errorMessages
        });
      }
      return res.status(400).json({
        success: false,
        message: error.message || "Invalid request payload"
      });
    }
  };
}

