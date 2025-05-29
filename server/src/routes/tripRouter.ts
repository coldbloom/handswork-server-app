import { Router } from "express";
import { TokenService } from "../services/Token";
import { TripController } from "../controllers/tripController";

const router = Router();
const trip = new TripController();

router.post('/publish', TokenService.checkAccess, (req, res) => trip.publishNewTrip(req, res));

router.get('/', (req, res) => trip.getTrips(req, res));

export default router;