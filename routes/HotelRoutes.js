const hotelController = require("../controllers/HotelController");
const auth = require("../auth/AuthValidation");
const router = require("express").Router();

router.post("/", auth.protect, auth.restrictToAdmin, hotelController.addHotel);
router.get("/", hotelController.getAllHotels);
router.get("/:id", hotelController.getHotelById);
router.put("/all/updateAll", hotelController.updateAllHotels);
router.put(
  "/:id",
  auth.protect,
  auth.restrictToAdmin,
  hotelController.updateHotel
);
router.delete(
  "/:id",
  auth.protect,
  auth.restrictToAdmin,
  hotelController.deleteHotel
);

module.exports = router;
