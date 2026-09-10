import { Router } from "express";
import {
    certs,
    dashboardPage,
    dashboardSigninController,
    dashboardSignupController,
    deleteOAuthClient,
    getClientMeta,
    getDashboardProjectsController,
    landingPage,
    registerClientPage,
    registerOAuthClient,
    signin,
    signup,
    token,
    updateOAuthClient,
    userLoginPage,
    userRegisterPage,
    userinfo
} from "./controller.js";
import { verifyAccessToken } from "./middleware.js";

const router = Router();

router.get("/", landingPage);
router.get("/dashboard", dashboardPage);
router.post("/dashboard/signup", dashboardSignupController);
router.post("/dashboard/login", dashboardSigninController);
router.get("/client/meta", getClientMeta);
router.get("/client/register", registerClientPage);
router.get("/clients", verifyAccessToken, getDashboardProjectsController);
router.post("/client/register", verifyAccessToken, registerOAuthClient);
router.put("/client/:clientId", verifyAccessToken, updateOAuthClient);
router.delete("/client/:clientId", verifyAccessToken, deleteOAuthClient);
router.get("/user/register", userRegisterPage);
router.post("/user/register", signup);
router.get("/user/login", userLoginPage);
router.post("/user/login", signin);
router.post("/token", token);
router.get("/userinfo", verifyAccessToken, userinfo);
router.get("/certs", certs);

export default router;
