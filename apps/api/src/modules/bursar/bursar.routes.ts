import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import multer from "multer";
import { authenticate } from "../../middleware/auth.js";
import { BursarController as C } from "./bursar.controller.js";

const router = Router();
router.use(authenticate);
// Role checks are intentional: stale permission claims cannot expand financial access.
router.use((req: Request, res: Response, next: NextFunction) => {
  if (!["BURSAR", "HEAD_TEACHER"].includes(req.user!.roleName))
    return res.status(403).json({
      success: false,
      message: "Finance access is restricted to the bursar and Head Teacher.",
    });
  next();
});
const bursarOnly = (req: Request, res: Response, next: NextFunction) => {
  if (req.user!.roleName !== "BURSAR")
    return res.status(403).json({
      success: false,
      message:
        "Only the bursar can record or correct expenses and other income.",
    });
  next();
};
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 15, fieldSize: 10000 },
}).single("attachment");
const attachmentUpload = (req: Request, res: Response, next: NextFunction) =>
  upload(req, res, (error) => {
    if (error)
      return res.status(400).json({
        success: false,
        message: "Attach one PDF, PNG or JPEG of at most 2 MB.",
      });
    next();
  });
router.get("/options", C.options);
router.get("/balances/export", C.exportBalances);
router.get("/balances", C.balances);
router.get("/dashboard", C.dashboard);
router.get("/reports", C.report);
router.get("/audit", C.audit);
router.post("/categories", bursarOnly, C.category);
router.put("/categories/:id", bursarOnly, C.updateCategory);
router.get("/expenses", C.entries("expense"));
router.post("/expenses", bursarOnly, attachmentUpload, C.record("expense"));
router.post("/expenses/:id/void", bursarOnly, C.voidEntry("expense"));
router.get("/expenses/:id/attachment", C.attachment);
router.get("/income", C.entries("income"));
router.post("/income", bursarOnly, C.record("income"));
router.post("/income/:id/void", bursarOnly, C.voidEntry("income"));
export default router;
