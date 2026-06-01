// Helper to format consistent API responses

export const responseHelper = {
  success: (res, data, statusCode = 200, message = 'Success') => {
    const requestId = res.req?.headers['x-request-id'] || 'req_unknown';
    
    return res.status(statusCode).json({
      success: true,
      data,
      error: null,
      meta: {
        request_id: requestId,
        timestamp: new Date().toISOString()
      }
    });
  },

  error: (res, code, message, statusCode = 400, details = {}) => {
    const requestId = res.req?.headers['x-request-id'] || 'req_unknown';

    return res.status(statusCode).json({
      success: false,
      data: null,
      error: {
        code,
        message,
        details
      },
      meta: {
        request_id: requestId,
        timestamp: new Date().toISOString()
      }
    });
  }
};
