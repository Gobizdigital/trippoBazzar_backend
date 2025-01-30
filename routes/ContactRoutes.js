const contactController = require("../controllers/ContactController");
const auth = require("../auth/AuthValidation");
const router = require("express").Router();

router.post("/", contactController.addContact);
router.get("/", contactController.getAllContacts);
router.get("/:id", contactController.getContactById);
router.put(
  "/:id",
  auth.protect,
  auth.restrictToAdmin,
  contactController.updateContact
);
router.delete(
  "/:id",
  auth.protect,
  auth.restrictToAdmin,
  contactController.deleteContact
);

module.exports = router;
