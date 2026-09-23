/** Validates `req[source]` against a zod schema and replaces it with the parsed value. */
export const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source])
  if (!result.success) {
    const error = new Error('Validation failed')
    error.status = 400
    error.details = result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }))
    return next(error)
  }
  req[source] = result.data
  return next()
}
