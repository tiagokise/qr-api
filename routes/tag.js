var express = require("express");
const TagController = require("../controllers/TagController");

var router = express.Router();

router.get("/", TagController.tagList);
router.get("/:id", TagController.tagDetail);
router.post("/", TagController.tagStore);
router.put("/:id", TagController.tagUpdate);
router.delete("/:id", TagController.tagDelete);

module.exports = router;