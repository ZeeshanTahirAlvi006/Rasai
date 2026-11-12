// src/auth/auth.schema.ts
// Zod request validation schemas for authentication payloads, OTP verifications, and password updates.
import { z } from "zod"

// Register function
export const RegisterBodySchema = z.object({
    body: z.object({
        username: z.string()
            .trim()
            .min(3, "username must be at least 3 characters")
            .max(30, "username can not be more than 30 characters"),
        email: z.string()
            .trim()
            .email("invalid email format"),
        password: z.string()
            .trim()
            .min(6, "password must be at least 6 characters"),
    })
})
export const LoginBodySchema = z.object({
    body: z.object({
        username: z.string({ error: "username or email is required" })
            .trim()
            .min(3, "username or email can not be less than 3 characters")
            .max(100, "username or email can not be longer than 100 characters"),
        password: z.string({ error: "password is required" })
            .trim()
            .min(6, "password can not be less than 6 characters")
    })
})
// get me function
export const GetMeHeaderSchema = z.object({
    headers: z.object({
        authorization: z.string({ error: "Authorization header is required" })
            .regex(/^Bearer \S+$/, "Invalid token format. Must be 'Bearer <token>'")
    })
})
//  refresh access token function

export const RefreshTokenCookieSchema = z.object({
    cookies: z.object({
        refreshToken: z.string().min(1).optional()
    }).optional(),
    body: z.object({
        refreshToken: z.string().min(1).optional()
    }).optional()
})
//verify email function
export const VerifyEmailBodySchema = z.object({
    body: z.object({
        otp: z.string({ error: "otp is missing" })
            .trim()
            .min(6, "invalid otp")
            .max(6, "invalid otp"),
        email: z.email("invalid email format")
            .trim()
    })
})
// resend email verification otp schema
export const ResendOtpBodySchema = z.object({
    body: z.object({
        email: z.email("invalid email format")
            .trim()
    })
})
//send reset password otp schema
export const sendResetPasswordOtpBodySchema = z.object({
    body: z.object({
        email: z.email("invalid email format").trim()
    })
})
// verify reset password otp schema
export const verifyResetPasswordOtpBodySchema = z.object({
    body: z.object({
        otp: z.string().trim().min(6, "invalid otp").max(6, "invalid otp")
    })
})
// reset password schema
export const resetPasswordBodySchema = z.object({
    body: z.object({
        resetToken: z.string().trim().min(1, "reset token is required"),
        password: z.string().trim().min(8, "password can not be less than 8 characters")
    })
})
