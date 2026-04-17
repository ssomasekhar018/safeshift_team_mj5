/**
 * SafeShift — Input Validation Middleware
 * express-validator chains for all auth endpoints
 */
const { body, validationResult } = require('express-validator');

// ─── Password Strength ────────────────────────────────────────────────────────
const isStrongPassword = (pwd) => {
  return (
    pwd.length >= 8 &&
    /[A-Z]/.test(pwd) &&
    /[0-9]/.test(pwd) &&
    /[^A-Za-z0-9]/.test(pwd)
  );
};

// ─── Validation Chains ────────────────────────────────────────────────────────

const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be 2–100 characters')
    .escape(),

  body('phone')
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Invalid Indian mobile number (10 digits, starting 6-9)'),

  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .custom((pwd) => {
      if (!isStrongPassword(pwd)) {
        throw new Error(
          'Password must include uppercase, number, and special character'
        );
      }
      return true;
    }),

  body('upi_id')
    .optional({ checkFalsy: true })
    .matches(/^[\w.\-]+@[\w.\-]+$/)
    .withMessage('Invalid UPI ID format (e.g. name@upi)'),

  body('platform')
    .optional()
    .isIn(['zepto', 'blinkit', 'swiggy_instamart', 'bigbasket_bb_now', 'dunzo', 'other'])
    .withMessage('Invalid platform'),

  body('zone_id')
    .optional()
    .isLength({ min: 3, max: 20 })
    .withMessage('Invalid zone'),
];

const loginValidation = [
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone is required'),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

const otpValidation = [
  body('phone')
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Invalid phone number'),

  body('otp')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('OTP must be 6 digits'),
];

// ─── Result Handler ───────────────────────────────────────────────────────────
// Returns field-level errors in {errors: [{field, message}]} format
const handleValidationErrors = (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const errors = result.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));
    return res.status(422).json({ errors });
  }
  next();
};

module.exports = {
  registerValidation,
  loginValidation,
  otpValidation,
  handleValidationErrors,
  isStrongPassword,
};
