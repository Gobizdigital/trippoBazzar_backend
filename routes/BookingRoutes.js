const BookingController = require("../controllers/BookingController");
const auth = require("../auth/AuthValidation");
const router = require("express").Router();

router.post("/", BookingController.addBooking);
router.get("/", BookingController.getAllBookings);
router.get("/:id", BookingController.getBookingById);
router.put(
  "/:id",
  auth.protect,
  auth.restrictToAdmin,
  BookingController.updateBooking
);
router.delete(
  "/:id",
  //   auth.protect,
  //   auth.restrictToAdmin,
  BookingController.deleteBooking
);

module.exports = router;
