const continentController = require("../controllers/ContinentController");
const auth = require("../auth/AuthValidation");
const router = require("express").Router();

// User creation route
router.post("/", auth.protect, auth.restrictToAdmin,continentController.addContinent);
router.get("/", continentController.getAllContinent);
router.get("/:id", continentController.getContinentById);
router.get("/fields/query", continentController.getContinentByQuery);
router.get("/name/:name", continentController.getContinentByName);
router.put("/:id",auth.protect, auth.restrictToAdmin, continentController.updateContinent);
router.delete("/:id",auth.protect, auth.restrictToAdmin, continentController.deleteContinent);

module.exports = router;
