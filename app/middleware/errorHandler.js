export function notFound(req, res) {
  res.status(404).json({ error: { message: `No route for ${req.method} ${req.originalUrl}` } })
}

// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity.
export function errorHandler(error, req, res, next) {
  const status = error.status || 500
  if (status >= 500) console.error('[error]', error)
  res.status(status).json({
    error: {
      message: error.message || 'Internal server error',
      ...(error.details ? { details: error.details } : {}),
    },
  })
}

/** Wraps an async handler so rejections reach the error middleware. */
export const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
