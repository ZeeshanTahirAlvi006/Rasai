// src/auth/auth.service.ts
// Core authentication services for merchant registration, JWT issuance, atomic refresh token rotation, and sessions.
import userModel from "../user/user.model.js";
import sessionModel from "../session/session.model.js";
import otpModel from "../otp/otp.model.js";
import jwt, { JwtPayload } from "jsonwebtoken"
import { config } from "@/config/index.js";
import * as crypto from "crypto"
import sendEmail from '../email/email.service.js'
import { generateOTP, getOtpHtml } from "../otp/otp.utils.js";
import mongoose from "mongoose"
import { emailEmitter } from "../email/emailEmitter.js";
import bcrypt from 'bcrypt'
import { AppError } from "../middleware/error.js";

interface customJwtPayLoad extends JwtPayload {
    id: string
}
interface registerData {
    username: string,
    email: string,
    password: string,
    ip: any,
    userAgent: any,
}
function generateCrypto(data: string) {
    return crypto.createHash("sha256").update(data).digest('hex')
}

export const registerService = async (userData: registerData) => {
    const { username, email, password, ip, userAgent } = userData;
    const alreadyRegistered = await userModel.findOne({
        $or: [{ username }, { email }]
    }).select('_id').lean().exec();
    if (alreadyRegistered) {
        throw new AppError(400, "user already exists", "username or email exists");
    }
    let newUser;
    try {
        newUser = await userModel.create({ username, email, password });
    } catch (err: any) {
        if (err?.code === 11000) {
            throw new AppError(409, "User with this username or email already exists", "user_already_exists");
        }
        throw err;
    }
    const otp = generateOTP()
    const html = getOtpHtml(otp)
    const otpHash = generateCrypto(otp)
    const newOtp = await otpModel.create({
        email: newUser?.email,
        user: newUser?._id,
        otpHash: otpHash,
    })
    console.log(`\n========================================\n🔐 [AUTH DEV OTP] Verification Code for ${newUser.email}: ${otp}\n========================================\n`);
    emailEmitter.emit('send_otp', { email: newUser.email, otp, html })

    return {
        success: true,
        status: 200,
        message: "user created successfully",
        data: {
            user: {
                _id: newUser?._id,
                username: newUser?.username,
                email: newUser?.email,
                verified: newUser?.verified,
                devOtp: config.nodeEnv !== 'production' ? otp : undefined
            }
        },
        error: null
    }
}

//login service
interface loginData {
    username: string,
    password: string,
    ip: string,
    userAgent: string
}
export const loginService = async (userData: loginData) => {
    const { username, password, ip, userAgent } = userData;
    const identifier = username.trim();
    const user = await userModel.findOne({
        $or: [{ username: identifier }, { email: identifier.toLowerCase() }]
    })
        .select("username email verified +password")
        .exec()
    if (!user) {
        throw new AppError(404, "Invalid credentials", "Invalid credentials");
    }
    const isPasswordValid = await user?.comparePassword(password)
    if (!isPasswordValid) {
        throw new AppError(401, "Invalid credentials", "Invalid credentials");
    }
    if (!user?.verified) {
        throw new AppError(401, "user not verified", "user not verified");
    }
    const userId = String(user._id)
    const sessionId = new mongoose.Types.ObjectId(); //pre-generate session ID
    const [refreshToken, accessToken] = await Promise.all([
        jwt.sign({
            id: userId,
            jti: crypto.randomUUID()
        }, config.jwtSecret, {
            expiresIn: "7d"
        }),
        jwt.sign({
            id: userId,
            sessionId: String(sessionId)
        }, config.jwtSecret, {
            expiresIn: "15m"
        })
    ])
    //session creation
    const refreshTokenHash = generateCrypto(refreshToken)
    const session = await sessionModel.create({
        _id: sessionId,
        userId: userId,
        refreshTokenHash: refreshTokenHash,
        ip: ip,
        userAgent: userAgent
    })
    //return the response
    return {
        success: true,
        status: 200,
        message: "login successful",
        data: {
            user: {

                _id: user?._id,
                username: user?.username,
                email: user?.email,
                accessToken: accessToken,
            }, refreshToken: refreshToken
        },
        error: null

    }
}

// get me service
export const getMeService = async (token: string) => {
    //access token is recieved
    const decoded = jwt.verify(token.trim() as string, config.jwtSecret as string) as unknown as customJwtPayLoad
    const id = decoded.id
    const user = await userModel.findById(id);
    return {
        success: true,
        status: 200,
        message: "user fetched successfully",
        data: {
            user: {
                _id: id,
                username: user?.username,
                email: user?.email
            }
        },
        error: null
    }

}

// refreshAccess token service
export const refreshAccessTokenService = async (refreshToken?: string) => {
    if (!refreshToken || typeof refreshToken !== 'string') {
        throw new AppError(401, "No refresh token provided", "missing_token");
    }
    const token = refreshToken.trim();
    const decoded = jwt.verify(token as string, config.jwtSecret as string) as unknown as customJwtPayLoad;
    const id = decoded.id;

    const refreshTokenHash = generateCrypto(refreshToken);
    const newRefreshToken = jwt.sign({
        id: id,
        jti: crypto.randomUUID()
    }, config.jwtSecret, {
        expiresIn: "7d"
    });
    const newRefreshTokenHash = generateCrypto(newRefreshToken);

    // Atomically rotate refresh token hash; fences against concurrent rotation race conditions (RC-AUTH-01)
    const session = await sessionModel.findOneAndUpdate(
        { refreshTokenHash, revoked: false },
        { $set: { refreshTokenHash: newRefreshTokenHash } },
        { returnDocument: 'after' }
    ).lean().exec();

    if (!session) {
        throw new AppError(401, "Invalid or expired refresh token", "invalid_token");
    }

    const newAccessToken = jwt.sign({
        id: id,
        sessionId: session._id
    }, config.jwtSecret, {
        expiresIn: "15m"
    });

    return {
        success: true,
        status: 200,
        message: "new access token generated",
        data: {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
        },
        error: null
    };
}

//log out service
export const logoutService = async (refreshToken: string) => {
    const refreshTokenHashed = generateCrypto(refreshToken);
    const session = await sessionModel.findOneAndUpdate(
        { refreshTokenHash: refreshTokenHashed, revoked: false },
        { $set: { revoked: true } },
        { returnDocument: 'after' }
    ).lean().exec();

    if (!session) {
        return { success: true, status: 200, message: "Session already revoked or logged out", data: null, error: null };
    }
    if (config.nodeEnv === "development") {
        console.log(session);
    }
    return {
        success: true,
        status: 200,
        message: "logout successful",
        data: null,
        error: null
    };
}

//logout all
export const logoutAllService = async (refreshToken: string) => {
    const decoded = jwt.verify(refreshToken as string, config.jwtSecret as string) as unknown as customJwtPayLoad
    const id = String(decoded.id)
    await sessionModel.updateMany({ userId: id, revoked: false }, {
        $set: { revoked: true }
    }).lean()
    return {
        success: true,
        status: 200,
        message: "all sessions logged out",
        data: null,
        error: null
    }
}

// verify email
export const verifyEmailService = async (otp: string, email: string) => {
    const otpHash = generateCrypto(otp)
    const found = await otpModel.findOne({ otpHash: otpHash })
    if (!found) {
        throw new AppError(401, "invalid otp", "invalid_otp");
    }
    const user = await userModel.findByIdAndUpdate(found.user, {
        $set: { verified: true }
    }, { returnDocument: 'after' }).lean().exec()
    await otpModel.deleteMany({ user: found.user }).exec()
    return {
        success: true,
        status: 200,
        message: "email verified",
        data: {

            user: {
                id: user?._id,
                email: user?.email,
                verified: user?.verified
            }
        },
        error: null
    }
}
//resend otp
export const resendOtpService = async (email: string) => {
    const otp = generateOTP()
    const otpHash = generateCrypto(otp)
    const html = getOtpHtml(otp)
    const user = await userModel.findOne({ email: email })
    if (!user) {
        throw new AppError(404, "invalid request", "invalid_request");
    }
    if (user?.verified) {
        throw new AppError(400, "email already verified", "email already verified");
    }
    await otpModel.deleteMany({ user: user?._id })
    const newOtp = await otpModel.create({
        email: user?.email,
        user: user?._id,
        otpHash: otpHash
    })
    console.log(`\n========================================\n🔐 [AUTH DEV OTP RESEND] Verification Code for ${user.email}: ${otp}\n========================================\n`);
    try {

        await sendEmail(user.email, "OTP VERIFICATION", `Your OTP is ${otp}`, html)
    } catch (emailError) {
        await otpModel.deleteMany({ user: user?._id });
        throw new AppError(500, "failed to send email", "failed to send email");
    }
    return {
        success: true,
        status: 200,
        message: "otp re-sent",
        data: null,
        error: null
    }

}
//reset  password otp send 
export const sendResetPasswordOtpService = async (email: string) => {
    console.log(email)
    const user = await userModel.findOne({ email: email })
        .select("_id email")
        .lean()
        .exec()
    if (!user) {
        throw new AppError(404, "bad request", "bad request");
    }
    const otp = generateOTP()
    const otpHash = generateCrypto(otp)
    const html = getOtpHtml(otp)
    const otpId = new mongoose.Types.ObjectId()
    const newOtp = await otpModel.create({
        _id: otpId,
        email: email,
        user: user._id,
        otpHash: otpHash,
        reason: "reset_password"
    })
    emailEmitter.emit('send_otp', { email: user.email, otp, html })
    return { success: true, status: 200, message: "otp generated successfully", data: null, error: null }
}

//verify reset password otp
export const verifyResetPasswordOtpService = async (otp: string) => {
    const otpHash = generateCrypto(otp)
    const matchOtp = await otpModel.findOne({ otpHash: otpHash, reason: "reset_password" })
        .select("_id email")
        .lean()
        .exec()
    if (!matchOtp) {
        throw new AppError(400, "invalid otp", "invalid_otp");
    }
    await otpModel.deleteMany({ _id: matchOtp._id, reason: "reset_password" }).exec()
    const resetToken = jwt.sign({
        email: matchOtp.email, action: "reset_password"
    }, config.jwtSecret as string, {
        expiresIn: '5m'
    }
    )
    return {
        success: true, status: 200, message: "otp verified successfully", data: { resetToken: resetToken }, error: null
    }

}

export const resetPasswordService = async (resetToken: string, password: string) => {
    let decoded: any
    try {
        decoded = jwt.verify(resetToken as string, config.jwtSecret as string)
    } catch (error) {
        throw new AppError(401, "invalid reset token", "invalid reset token");
    }
    if (decoded.action !== "reset_password") {
        throw new AppError(401, "unauthorized", "unauthorized");
    }
    const hash = await bcrypt.hash(password, 12)
    const user = await userModel.findOneAndUpdate({ email: decoded.email }, {
        $set: { password: hash }
    }, { returnDocument: 'after' })
        .select("_id")
        .lean()
        .exec()
    if (!user) {
        throw new AppError(404, "user not found", "user not found");
    }
    return {
        success: true, status: 200, message: "password reset successfully", data: null, error: null
    }
}
