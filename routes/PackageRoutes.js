const packageController = require("../controllers/PackageController");
const auth = require("../auth/AuthValidation");
const router = require("express").Router();

router.post("/", auth.protect, auth.restrictToAdmin,packageController.addPackage);
router.get("/", packageController.getAllPackages);
router.get("/:id", packageController.getPackageById);
router.put("/:id", packageController.updatePackage);
router.delete("/:id", auth.protect, auth.restrictToAdmin,packageController.deletePackage);
router.post("/verifyAmount", packageController.verifyAmount);
router.post("/createOrder", packageController.createOrder);
router.post("/verifyPayment", packageController.verfiyPayment);

module.exports = router;
