export const ok = (payload, meta = {}) => ({
  success: true,
  ...meta,
  data: payload,
});

export const fail = (message, status = 400, details = null) => ({
  success: false,
  error: {
    message,
    status,
    details,
  },
});
