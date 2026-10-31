// src/email/emailEmitter.ts
// Asynchronous event emitter decoupling HTTP request threads from email delivery.
import { EventEmitter } from 'events';
import sendEmail from './email.service.js';
import { config } from '../config/index.js';

export const emailEmitter = new EventEmitter();

emailEmitter.on('send_otp', async (data) => {
    try {
        const { email, otp, html } = data;
        await sendEmail(email, "OTP VERIFICATION", `Your OTP is ${otp}`, html);
    } catch (error) {
        console.error("failed to send otp: ", error);
    }
});

export interface OpsAlertEmailPayload {
    subject: string;
    text: string;
    html?: string;
    to?: string;
}

emailEmitter.on('send_ops_alert', async (data: OpsAlertEmailPayload) => {
    try {
        const recipient = data.to || config.google?.user;
        if (process.env.NODE_ENV === 'test' || !recipient) return;
        await sendEmail(recipient, data.subject, data.text, data.html || `<p>${data.text}</p>`);
    } catch (error) {
        console.error("failed to dispatch ops alert email: ", error);
    }
});
