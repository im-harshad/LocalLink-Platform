const { body, validationResult } = require('express-validator');

// Professional Validation Error Formatter
const validateReq = (req, res, next) => {
    const error = validationResult(req);
    if (!error.isEmpty()) {
        return res.status(400).json({ 
            success: false,
            message: 'Validation failed. Please check your inputs.',
            errors: error.array().map(err => ({
                field: err.path,
                msg: err.msg
            }))
        });
    }
    next();
};

const authValidation = [
    body('name')
        .trim()
        .notEmpty().withMessage('Full name is required')
        .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    body('email')
        .trim()
        .isEmail().withMessage('Please provide a valid business or personal email'),
    body('password')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
        .matches(/\d/).withMessage('Password must contain at least one number')
        .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter'),
    body('role')
        .isIn(['customer', 'provider']).withMessage('Invalid account type selected'),
    validateReq
];

const loginValidation = [
    body('email').trim().isEmail().withMessage('Please provide a valid registered email'),
    body('password').notEmpty().withMessage('Password cannot be empty'),
    validateReq
];

const serviceValidation = [
    body('name').trim().notEmpty().withMessage('Service name is required'),
    body('category_id').isInt({ min: 1 }).withMessage('Valid service category must be selected'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a valid non-negative number'),
    body('experience').optional().isInt({ min: 0 }).withMessage('Experience must be a valid number'),
    validateReq
];

module.exports = {
    authValidation,
    loginValidation,
    serviceValidation
};

