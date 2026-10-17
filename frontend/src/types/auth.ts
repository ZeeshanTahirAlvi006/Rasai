//----------Registration-------------
export interface IRegister {
    username: string,
    email: string,
    password?: string
}
export interface IUser {
    _id: string,
    username: string,
    email: string,
    verified: boolean,
    devOtp?: string
}
export interface RegisterResDto {
    success: boolean,
    message: string,
    data?: IUser,
    user?: IUser,
    error?: string | null
}

//----------Email Verification-------------
export interface verifyOtpDto {
    success: boolean,
    message: string,
    data?: {
        user: {
            id: string,
            email: string,
            verified: boolean
        }
    },
    user?: {
        id: string,
        email: string,
        verified: boolean
    },
    error?: string | null
}
export interface IVerifyData {
    email: string,
    otp: string
}

//----------Login-------------
export interface LoginResDto {
    success: boolean,
    message: string,
    data?: {
        accessToken: string,
        user: IUser
    },
    accessToken?: string,
    user?: IUser,
    error?: string | null
}
export interface ICredentials {
    username: string,
    password: string
}


