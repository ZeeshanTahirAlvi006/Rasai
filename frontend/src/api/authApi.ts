import API from "./api";
import { type AxiosResponse } from "axios"
import {
    type IRegister,
    type RegisterResDto,
    type IUser,
    type IVerifyData,
    type verifyOtpDto,
    type LoginResDto,
    type ICredentials
} from "../types/auth";

// Register User
export const register = async (userData: IRegister, signal?: AbortSignal): Promise<RegisterResDto> => {
    try {
        const response: AxiosResponse = await API.post("/auth/register", userData, { signal })
        return response.data
    } catch (error) {
        throw error
    }
}
// Email verification OTP
export const verifyOtp = async (data: IVerifyData, signal?: AbortSignal): Promise<verifyOtpDto> => {
    try {
        const response: AxiosResponse = await API.post("/auth/verify-email", data, { signal })
        return response.data
    } catch (error) {
        throw error
    }
}


// Login
export const login = async (userData: ICredentials, signal?: AbortSignal): Promise<LoginResDto> => {
    try {
        const response: AxiosResponse = await API.post("/auth/login", userData, { signal })
        return response.data
    } catch (error) {
        throw error
    }
}

//Resend Email Verification OTP
export const resendEmailVerificationOtp = async (email: string, signal?: AbortSignal): Promise<any> => {
    try {
        const response: AxiosResponse = await API.post("/auth/resend-otp", { email }, { signal })
        return response.data
    } catch (error) {
        throw error
    }
}


//logout
export interface logoutDto {
    success: boolean,
    message: string
}
