import { EventEmitter } from 'events'
import sendEmail from './email.service.js';
export const emailEmitter = new EventEmitter();
emailEmitter.on('send_otp', async (data) => {
    try {
        const { email, otp, html } = data;
        await sendEmail(email, "OTP VERIFICATION", `Your OTP is ${otp}`, html)
    } catch (error) {
        console.error("failed to send otp: ", error)
    }
})