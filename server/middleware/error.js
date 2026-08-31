export const notFound = (req, res) => res.status(404).json({ message: `Route ${req.originalUrl} not found` });
export const errorHandler = (err, _req, res, _next) => {
  console.error('[error]', err.message);
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Server error', ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }) });
};