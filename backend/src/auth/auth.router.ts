import { Router } from "express"
import {
    register,
    getMe,
    refreshAccessToken,
    logout,
    login,
    logoutAll,
    verifyEmail,
    resendOtp, sendResetPasswordOtp, verifyResetPasswordOtp, resetPassword
} from "./auth.controller.js"
import {
    RegisterBodySchema,
    GetMeHeaderSchema,
    RefreshTokenCookieSchema,
    LoginBodySchema,
    VerifyEmailBodySchema,
    ResendOtpBodySchema,
    sendResetPasswordOtpBodySchema,
    verifyResetPasswordOtpBodySchema,
    resetPasswordBodySchema
} from "./auth.schema.js";
import { validate } from "../middleware/validate.js";

const authRouter = Router();

authRouter.post('/register', validate(RegisterBodySchema), register)
authRouter.post("/login", validate(LoginBodySchema), login)
authRouter.get('/get-me', validate(GetMeHeaderSchema), getMe)
authRouter.post('/refresh-token', validate(RefreshTokenCookieSchema), refreshAccessToken)
authRouter.post("/logout", validate(RefreshTokenCookieSchema), logout)
authRouter.post("/logout-all", validate(RefreshTokenCookieSchema), logoutAll)
authRouter.post('/verify-email', validate(VerifyEmailBodySchema), verifyEmail)
authRouter.post("/resend-otp", validate(ResendOtpBodySchema), resendOtp)
authRouter.post('/send-reset-otp', validate(sendResetPasswordOtpBodySchema), sendResetPasswordOtp)
authRouter.post("/verify-reset-otp", validate(verifyResetPasswordOtpBodySchema), verifyResetPasswordOtp)
authRouter.post('/reset-password', validate(resetPasswordBodySchema), resetPassword)

export default authRouter;