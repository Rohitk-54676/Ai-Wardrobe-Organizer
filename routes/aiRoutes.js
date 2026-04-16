import express from "express";
import { getAISuggestion } from "../controllers/aiController.js";

const router = express.Router();

router.post("/suggest", getAISuggestion);

export default router;