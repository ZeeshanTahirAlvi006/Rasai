// src/email/email.service.ts
// Nodemailer Gmail OAuth2 transporter for sending verification OTPs and ops notification emails.
import nodemailer from "nodemailer"
import { config } from "../config/index.js"

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        type: "OAuth2",
        user: config.google.user,
        clientId: config.google.clientId,
        clientSecret: config.google.clientSecret,
        refreshToken: config.google.refreshToken

    }
})

if (config.nodeEnv !== 'test' && config.google?.user) {
    transporter.verify((error, success) => {
        if (error && config.nodeEnv === "development") {
            console.error("Error connecting to gmail")
        } else if (success) {
            console.log("Gmail transporter connected successfully")
        }
    });
}

export interface EmailAttachment {
    filename: string;
    content: Buffer | string;
    contentType?: string;
}

const sendEmail = async (to: any, subject: any, text: any, html: any, attachments?: EmailAttachment[]) => {
    try {
        const info = await transporter.sendMail({
            from: `"NDR Operations" <${config.google.user || 'ops@ndr.local'}>`,
            to,
            subject,
            text,
            html,
            attachments,
        })
        if (config.nodeEnv === "development") {
            console.log("Message send: %s", info.messageId);
            console.log("PreviewURL: %s", nodemailer.getTestMessageUrl(info))
        }
        return info;
    } catch (error) {
        if (config.nodeEnv === "development") {
            console.error("error: ", error)
        } else {
            console.error("internal server error")
        }
        throw error;
    }
}

export default sendEmail