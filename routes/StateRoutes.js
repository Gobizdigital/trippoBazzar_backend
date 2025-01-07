const stateController = require("../controllers/StateController");
const auth = require("../auth/AuthValidation");
const router = require("express").Router();

router.post("/", auth.protect, auth.restrictToAdmin,stateController.addState);
router.get("/", stateController.getAllStates);
router.get("/:id", stateController.getStateById);
router.get("/name/:name", stateController.getStateByName);
router.put("/:id", auth.protect, auth.restrictToAdmin,stateController.updateState);
router.delete("/:id",  auth.protect, auth.restrictToAdmin,stateController.deleteState);

module.exports = router;
