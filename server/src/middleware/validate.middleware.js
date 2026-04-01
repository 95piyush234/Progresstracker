export function validate(schema, property = "body") {
  return (req, _res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      error.statusCode = 400;
      error.details = error.details;
      error.message = error.details.map((item) => item.message).join(" ");
      next(error);
      return;
    }

    if (property === "query") {
      req.validatedQuery = value;
    } else {
      req[property] = value;
    }

    next();
  };
}
