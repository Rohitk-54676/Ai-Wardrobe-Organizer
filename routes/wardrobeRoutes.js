import express from "express";
import { addCloth, getClothes, deleteCloth } from "../controllers/wardrobeController.js";

const router = express.Router();

router.post("/", addCloth);
router.get("/", getClothes);
router.delete("/:id", deleteCloth);

export default router;