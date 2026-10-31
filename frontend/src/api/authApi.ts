// src/api/authApi.ts
// Typed API client for user registration, OTP email verification, and merchant login/logout with telemetry logging.
import API from "./api";
import { recordLog } from "./telemetry";
import { type AxiosResponse } from "axios";
import {
    type IRegister,
    type RegisterResDto,
    type IUser,
    type IVerifyData,
    type verifyOtpDto,
    type LoginResDto,
    type ICredentials
} from "../types/auth";

async function loggedPost<T>(endpoint: string, data: any, signal?: AbortSignal): Promise<T> {
    const start = performance.now();
    try {
        const response: AxiosResponse = await API.post(endpoint, data, { signal });
        recordLog({
            timestamp: new Date().toLocaleTimeString(),
            endpoint,
            method: 'POST',
            status: response.status,
            durationMs: Math.round(performance.now() - start),
            payload: endpoint.includes('login') ? { ...data, password: '***' } : data,
            response: response.data,
            error: null,
        });
        return response.data;
    } catch (error: any) {
        recordLog({
            timestamp: new Date().toLocaleTimeString(),
            endpoint,
            method: 'POST',
            status: error.response?.status || 500,
            durationMs: Math.round(performance.now() - start),
            payload: endpoint.includes('login') ? { ...data, password: '***' } : data,
            response: error.response?.data,
            error: error.response?.data?.message || error.message,
        });
        throw error;
    }
}

// Register User
export const register = async (userData: IRegister, signal?: AbortSignal): Promise<RegisterResDto> => {
    return loggedPost<RegisterResDto>("/auth/register", userData, signal);
};

// Email verification OTP
export const verifyOtp = async (data: IVerifyData, signal?: AbortSignal): Promise<verifyOtpDto> => {
    return loggedPost<verifyOtpDto>("/auth/verify-email", data, signal);
};

// Login
export const login = async (userData: ICredentials, signal?: AbortSignal): Promise<LoginResDto> => {
    return loggedPost<LoginResDto>("/auth/login", userData, signal);
};

// Resend Email Verification OTP
export const resendEmailVerificationOtp = async (email: string, signal?: AbortSignal): Promise<any> => {
    return loggedPost<any>("/auth/resend-otp", { email }, signal);
};

// Logout Dto
export interface logoutDto {
    success: boolean;
    message: string;
}
