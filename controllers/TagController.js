const Tag = require("../models/TagModel");
const { body,validationResult } = require("express-validator");
const { sanitizeBody } = require("express-validator");
const apiResponse = require("../helpers/apiResponse");
const auth = require("../middlewares/jwt");
var mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);

// Tag Schema
function TagData(data) {
	this.id = data._id;
	this.name= data.name;
	this.description = data.description;
	this.qrcode = data.qrcode;
	this.createdAt = data.createdAt;
}

/**
 * Tag List.
 * 
 * @returns { Object }
 */
exports.tagList = [
	// auth,
	function (req, res) {
		try {
			Tag.find({user: req.user._id},"_id title description isbn createdAt")
				.then((books)=>{
					if(books.length > 0){
						return apiResponse.successResponseWithData(res, "Operation success", books);
					}else{
						return apiResponse.successResponseWithData(res, "Operation success", []);
					}
				});
		} catch (err) {
			//throw error in json response with status 500. 
			return apiResponse.ErrorResponse(res, err);
		}
	}
];

/**
 * Tag Detail.
 * 
 * @param {string}      id
 * 
 * @returns {Object}
 */
exports.tagDetail = [
	auth,
	function (req, res) {
		if(!mongoose.Types.ObjectId.isValid(req.params.id)){
			return apiResponse.successResponseWithData(res, "Operation success", {});
		}
		try {
			Tag.findOne({_id: req.params.id,user: req.user._id},"_id title description isbn createdAt").then((book)=>{                
				if(book !== null){
					let bookData = new TagData(book);
					return apiResponse.successResponseWithData(res, "Operation success", bookData);
				}else{
					return apiResponse.successResponseWithData(res, "Operation success", {});
				}
			});
		} catch (err) {
			//throw error in json response with status 500. 
			return apiResponse.ErrorResponse(res, err);
		}
	}
];

/**
 * Tag store.
 * 
 * @param {string}      title 
 * @param {string}      description
 * @param {string}      isbn
 * 
 * @returns {Object}
 */
exports.tagStore = [
	auth,
	body("title", "Title must not be empty.").isLength({ min: 1 }).trim(),
	body("description", "Description must not be empty.").isLength({ min: 1 }).trim(),
	body("isbn", "ISBN must not be empty").isLength({ min: 1 }).trim().custom((value,{req}) => {
		return Tag.findOne({isbn : value,user: req.user._id}).then(book => {
			if (book) {
				return Promise.reject("Tag already exist with this ISBN no.");
			}
		});
	}),
	sanitizeBody("*").escape(),
	(req, res) => {
		try {
			const errors = validationResult(req);
			var book = new Tag(
				{ title: req.body.title,
					user: req.user,
					description: req.body.description,
					isbn: req.body.isbn
				});

			if (!errors.isEmpty()) {
				return apiResponse.validationErrorWithData(res, "Validation Error.", errors.array());
			}
			else {
				//Save book.
				book.save(function (err) {
					if (err) { return apiResponse.ErrorResponse(res, err); }
					let bookData = new TagData(book);
					return apiResponse.successResponseWithData(res,"Tag add Success.", bookData);
				});
			}
		} catch (err) {
			//throw error in json response with status 500. 
			return apiResponse.ErrorResponse(res, err);
		}
	}
];

/**
 * Tag update.
 * 
 * @param {string}      title 
 * @param {string}      description
 * @param {string}      isbn
 * 
 * @returns {Object}
 */
exports.tagUpdate = [
	auth,
	body("title", "Title must not be empty.").isLength({ min: 1 }).trim(),
	body("description", "Description must not be empty.").isLength({ min: 1 }).trim(),
	body("isbn", "ISBN must not be empty").isLength({ min: 1 }).trim().custom((value,{req}) => {
		return Tag.findOne({isbn : value,user: req.user._id, _id: { "$ne": req.params.id }}).then(book => {
			if (book) {
				return Promise.reject("Tag already exist with this ISBN no.");
			}
		});
	}),
	sanitizeBody("*").escape(),
	(req, res) => {
		try {
			const errors = validationResult(req);
			var book = new Tag(
				{ title: req.body.title,
					description: req.body.description,
					isbn: req.body.isbn,
					_id:req.params.id
				});

			if (!errors.isEmpty()) {
				return apiResponse.validationErrorWithData(res, "Validation Error.", errors.array());
			}
			else {
				if(!mongoose.Types.ObjectId.isValid(req.params.id)){
					return apiResponse.validationErrorWithData(res, "Invalid Error.", "Invalid ID");
				}else{
					Tag.findById(req.params.id, function (err, foundBook) {
						if(foundBook === null){
							return apiResponse.notFoundResponse(res,"Tag not exists with this id");
						}else{
							//Check authorized user
							if(foundBook.user.toString() !== req.user._id){
								return apiResponse.unauthorizedResponse(res, "You are not authorized to do this operation.");
							}else{
								//update book.
								Tag.findByIdAndUpdate(req.params.id, book, {},function (err) {
									if (err) { 
										return apiResponse.ErrorResponse(res, err); 
									}else{
										let bookData = new TagData(book);
										return apiResponse.successResponseWithData(res,"Tag update Success.", bookData);
									}
								});
							}
						}
					});
				}
			}
		} catch (err) {
			//throw error in json response with status 500. 
			return apiResponse.ErrorResponse(res, err);
		}
	}
];

/**
 * Tag Delete.
 * 
 * @param {string}      id
 * 
 * @returns {Object}
 */
exports.tagDelete = [
	auth,
	function (req, res) {
		if(!mongoose.Types.ObjectId.isValid(req.params.id)){
			return apiResponse.validationErrorWithData(res, "Invalid Error.", "Invalid ID");
		}
		try {
			Tag.findById(req.params.id, function (err, foundBook) {
				if(foundBook === null){
					return apiResponse.notFoundResponse(res,"Tag not exists with this id");
				}else{
					//Check authorized user
					if(foundBook.user.toString() !== req.user._id){
						return apiResponse.unauthorizedResponse(res, "You are not authorized to do this operation.");
					}else{
						//delete book.
						Tag.findByIdAndRemove(req.params.id,function (err) {
							if (err) { 
								return apiResponse.ErrorResponse(res, err); 
							}else{
								return apiResponse.successResponse(res,"Tag delete Success.");
							}
						});
					}
				}
			});
		} catch (err) {
			//throw error in json response with status 500. 
			return apiResponse.ErrorResponse(res, err);
		}
	}
];