import { authService } from '../services/auth.service.js';
import { responseHelper } from '../utils/response.js';

export const authController = {
  
  // POST /api/v1/auth/register
  register: async (req, res, next) => {
    try {
      const { name, email, phone, password, pin, role } = req.body;

      if (!name || !email || !password || !pin) {
        return responseHelper.error(
          res, 
          'BAD_REQUEST', 
          'Name, email, password, dan PIN transaksi wajib diisi', 
          400
        );
      }

      const result = await authService.register(name, email, phone, password, pin, role || 'RETAIL_CUSTOMER');
      
      return responseHelper.success(res, result, 201);
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/auth/login
  login: async (req, res, next) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return responseHelper.error(
          res, 
          'BAD_REQUEST', 
          'Email dan password wajib diisi', 
          400
        );
      }

      const result = await authService.login(email, password);
      
      return responseHelper.success(res, result, 200);
    } catch (err) {
      next(err);
    }
  }
};
