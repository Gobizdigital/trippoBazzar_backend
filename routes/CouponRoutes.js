const couponController = require("../controllers/CouponController");
const auth = require("../auth/AuthValidation");
const router = require("express").Router();

router.post("/", auth.protect, auth.restrictToAdmin,couponController.addcoupon);
router.get("/", couponController.getAllCoupons);
router.get("/:id", couponController.getCouponById);
router.put("/:id", auth.protect, auth.restrictToAdmin,couponController.updateCoupon);
router.delete("/:id", auth.protect, auth.restrictToAdmin,couponController.deleteCoupon);

module.exports = router;
