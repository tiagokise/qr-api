const UserModel = require("../models/UserModel");
const { body,validationResult } = require("express-validator");
const { sanitizeBody } = require("express-validator");
const apiResponse = require("../helpers/apiResponse");
const utility = require("../helpers/utility");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mailer = require("../helpers/mailer");
const { constants } = require("../helpers/constants");

/**
 * User registration.
 * @param {string} userFullName
 * @param {string} email
 * @param {string} phone
 * @param {string} password
 * 
 * @returns {Object}
 */

exports.signup = [
	body("userFullName")
		.isLength({ min: 3 }).trim().withMessage("Nome completo é obrigatório."),

	body("email")
		.isLength({ min: 3 }).trim().withMessage("Email é obrigatório.")
		.isEmail().withMessage("Por favor insira um email válido.")
    .custom((value) => {
			return UserModel.findOne({email : value}).then((user) => {
				if (user) { return Promise.reject("E-mail já está em uso"); }
			});
		}),

  body("phone")
    .isLength({ min: 11 }).trim().withMessage("Telefone é obrigatório.")
    .isNumeric().withMessage("Por favor insira um telefone válido."),

	body("password")
    .isLength({ min: 6 }).trim().withMessage("A Senha deve ter no minímo 6 caracteres."),

	sanitizeBody("userFullName").escape(),
	sanitizeBody("email").escape(),
	sanitizeBody("phone").escape(),
	sanitizeBody("password").escape(),

	(req, res) => {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) { return apiResponse.validationErrorWithData(res, "Validation Error.", errors.array()); }
			bcrypt.hash(req.body.password, 10, function(err, hash) {
				let otp = utility.randomNumber(4);
        var user = new UserModel({
          userFullName: req.body.userFullName, 
          phone: req.body.email, 
          email: req.body.email, 
          password: hash, 
          confirmOTP: otp 
        });
        user.save((err) => {
          if (err) { return apiResponse.ErrorResponse(res, err); }
          let userData = { _id: user._id, userFullName: user.userFullName, phone: user.phone, email: user.email };
          return apiResponse.successResponseWithData(res,"Registration Success.", userData);
        });
        // let html = "<p>Por favor comfirme seu email.</p><p>Código: "+otp+"</p>";
        // mailer.send(constants.confirmEmails.from, req.body.email, "Confirm Account", html)
        //   .then(() => {
        //   }).catch(err => {
        //     console.log(err);
        //     return apiResponse.ErrorResponse(res,err);
        //   });
      });
    } catch (err) { return apiResponse.ErrorResponse(res, err); }
	}];


/**
 * User login.
 * @param {string} email
 * @param {string} password
 *
 * @returns {Object}
 */

exports.login = [
	body("email")
    .isLength({ min: 1 }).trim().withMessage("Email must be specified.")
		.isEmail().withMessage("Email must be a valid email address."),

	body("password")
    .isLength({ min: 1 }).trim().withMessage("Password must be specified."),

	sanitizeBody("email").escape(),
	sanitizeBody("password").escape(),

	(req, res) => {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) { return apiResponse.validationErrorWithData(res, "Validation Error.", errors.array()); }; 
			UserModel.findOne({email : req.body.email}).then(user => {
        if(!user) { return apiResponse.notFoundResponse(res, "Houve um problema, verifique seu email e senha e tente novamente!"); }
        bcrypt.compare(req.body.password,user.password, (err, same) => {
          if(!same) { return apiResponse.unauthorizedResponse(res, "Houve um problema, verifique seu email e senha e tente novamente!"); }
          if(!user.isConfirmed) { return apiResponse.unauthorizedResponse(res, "Por favor confirme seu email."); }
          if(!user.status) { return apiResponse.unauthorizedResponse(res, "Sua conta está desativada, por favor entre em contato com o administrador."); }
          let userData = { _id: user._id, userFullName: user.userFullName, email: user.email };
          const jwtPayload = userData;
          const jwtData = { expiresIn: process.env.JWT_TIMEOUT_DURATION };
          const secret = process.env.JWT_SECRET;
          userData.token = jwt.sign(jwtPayload, secret, jwtData);
          return apiResponse.successResponseWithData(res,"Login Success.", userData);
        });
      });
		} catch (err) { return apiResponse.ErrorResponse(res, err); }
	}];

/**
 * Verify Confirm otp.
 * @param {string} email
 * @param {string} otp
 *
 * @returns {Object}
 */

exports.verifyConfirm = [
	body("email")
    .isLength({ min: 1 }).trim().withMessage("Email must be specified.")
		.isEmail().withMessage("Email must be a valid email address."),
	body("otp"
    ).isLength({ min: 1 }).trim().withMessage("OTP must be specified."),

	sanitizeBody("email").escape(),
	sanitizeBody("otp").escape(),

	(req, res) => {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) { return apiResponse.validationErrorWithData(res, "Validation Error.", errors.array()); }
			var query = { email : req.body.email };
			UserModel.findOne(query).then(user => {
        if(!user) { return apiResponse.unauthorizedResponse(res, "Email não encontrado.") }
				if(user.isConfirmed){return apiResponse.unauthorizedResponse(res, "Conta já confirmada."); }
				if(user.confirmOTP !== req.body.otp) { return apiResponse.unauthorizedResponse(res, "Otp does not match"); }
				UserModel.findOneAndUpdate(query, { isConfirmed: true, confirmOTP: null })
          .catch(err => { return apiResponse.ErrorResponse(res, err); });
				return apiResponse.successResponse(res,"Account confirmed success.");			
			});
		} catch (err) { return apiResponse.ErrorResponse(res, err); }
	}];

/**
 * Resend Confirm otp.
 *
 * @param {string}      email
 *
 * @returns {Object}
 */
exports.resendConfirmOtp = [
	body("email").isLength({ min: 1 }).trim().withMessage("Email must be specified.")
		.isEmail().withMessage("Email must be a valid email address."),
	sanitizeBody("email").escape(),
	(req, res) => {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return apiResponse.validationErrorWithData(res, "Validation Error.", errors.array());
			}else {
				var query = {email : req.body.email};
				UserModel.findOne(query).then(user => {
					if (user) {
						//Check already confirm or not.
						if(!user.isConfirmed){
							// Generate otp
							let otp = utility.randomNumber(4);
							// Html email body
							let html = "<p>Please Confirm your Account.</p><p>OTP: "+otp+"</p>";
							// Send confirmation email
							mailer.send(
								constants.confirmEmails.from, 
								req.body.email,
								"Confirm Account",
								html
							).then(function(){
								user.isConfirmed = 0;
								user.confirmOTP = otp;
								// Save user.
								user.save(function (err) {
									if (err) { return apiResponse.ErrorResponse(res, err); }
									return apiResponse.successResponse(res,"Confirm otp sent.");
								});
							});
						}else{
							return apiResponse.unauthorizedResponse(res, "Account already confirmed.");
						}
					}else{
						return apiResponse.unauthorizedResponse(res, "Specified email not found.");
					}
				});
			}
		} catch (err) {
			return apiResponse.ErrorResponse(res, err);
		}
	}];