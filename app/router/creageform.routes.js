const express = require("express");
const router = express.Router();

const {createForm }= require("../constroller/createfrom.controller");



router.post("/create", createForm);

router.get("/", (req, res) => {
    res.render("form", { message: req.session.message });
    req.session.message = null;
});

module.exports = router;