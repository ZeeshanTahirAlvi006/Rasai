// src/auth/auth.controller.ts
// Thin Express controller for user registration, authentication, token refresh, and session management.
import { Request, Response } from "express"
import { asyncHandler } from "../middleware/asyncHandler.js";
import { AppError } from "../middleware/error.js"
import { config } from "../config/index.js"
import {
    registerService,
    getMeService,
    refreshAccessTokenService,
    loginService,
    logoutService,
    logoutAllService,
    verifyEmailService,
    resendOtpService,
    sendResetPasswordOtpService,
    verifyResetPasswordOtpService,
    resetPasswordService
} from "./auth.service.js";

const setRefreshTokenCookie = (_: Request, res: Response, token: string) => {
    res.cookie("refreshToken", token, {
        httpOnly: true,
        secure: config.nodeEnv === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000
    })
}
//register
export const register = asyncHandler(async (req: Request, res: Response) => {
    const ip = req.ip || "unknown"
    const userAgent = req.headers["user-agent"] || "unknown"
    const result = await registerService({ ...req.body, ip, userAgent });
    const response = {
        success: result?.success,
        message: result?.message,
        data: result?.data?.user,
        error: result?.error
    }
    return res.status(result?.status as number).json(response)
})
//get me
export const getMe = asyncHandler(async (req: Request, res: Response) => {
    const result = await getMeService(req.headers.authorization?.split(" ")[1] as string)
    const response = {
        success: result?.success,
        message: result?.message,
        data: result?.data?.user,
        error: result?.error
    }
    return res.status(result?.status as number).json(response)

})

//refresh access token
export const refreshAccessToken = asyncHandler(async (req: Request, res: Response) => {
    const result = await refreshAccessTokenService(req.cookies?.refreshToken as string)
    setRefreshTokenCookie(req, res, result?.data?.refreshToken);
    const response = {
        success: result?.success,
        message: result?.message,
        data: {
            accessToken: result?.data?.accessToken
        },
        error: result?.error
    }
    return res.status(result?.status as number).json(response)
})
//logout
export const logout = asyncHandler(async (req: Request, res: Response) => {
    const result = await logoutService(req.cookies?.refreshToken as string)
    res.clearCookie("refreshToken")
    return res.status(result?.status as number).json(result)
})
//login controller
export const login = asyncHandler(async (req: Request, res: Response) => {
    const result = await loginService({
        ...req.body,
        ip: req.ip || "unknown",
        userAgent: req.headers['user-agent'] || "unknown"
    })
    setRefreshTokenCookie(req, res, result?.data?.refreshToken)
    const response = {
        success: result?.success,
        message: result?.message,
        data: {
            user: result?.data?.user,
            accessToken: result?.data?.user?.accessToken
        },
        error: result?.error
    }
    return res.status(result?.status as number).json(response)
})
//logout all
export const logoutAll = asyncHandler(async (req: Request, res: Response) => {
    const result = await logoutAllService(req.cookies?.refreshToken as string)
    res.clearCookie("refreshToken")
    return res.status(result?.status as number).json(result)
})
//verify email 
export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {

    const { otp, email } = req.body
    const result = await verifyEmailService(otp, email)
    return res.status(result?.status as number).json(result)
})
//resend email verification otp
export const resendOtp = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body
    const result = await resendOtpService(email)
    res.status(result?.status as number).json(result)
})
//send email reset password otp
export const sendResetPasswordOtp = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body
    const result = await sendResetPasswordOtpService(email)
    res.status(result?.status as number).json(result)
})
// verify reset pw otp
export const verifyResetPasswordOtp = asyncHandler(async (req: Request, res: Response) => {
    const { otp } = req.body
    const result = await verifyResetPasswordOtpService(otp)
    res.status(result?.status as number).json(result)
})
// reset pw
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const { resetToken, password } = req.body

    const result = await resetPasswordService(resetToken, password)
    res.status(result?.status as number).json(result)
})