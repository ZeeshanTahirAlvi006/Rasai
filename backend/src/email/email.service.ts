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

transporter.verify((error, success) => {
    if (error && config.nodeEnv === "development") {
        console.error("Error connecting to gmail")
    } else if (success) {
        console.error("success")
    } else {
        console.error("Internal server error")
    }

});

const sendEmail = async (to: any, subject: any, text: any, html: any) => {
    try {
        const info = await transporter.sendMail({
            from: `"Zeeshan Tahir Alvi" <${config.google.user}>`,
            to,//reciever(s)
            subject,
            text,
            html
        })
        if (config.nodeEnv === "development") {
            console.log("Message send: %s", info.messageId);
            console.log("PreviewURL: %s", nodemailer.getTestMessageUrl(info))
        }

    } catch (error) {
        if (config.nodeEnv === "development") {
            console.error("error: ", error)
        } else {
            console.error("internal server error")
        }
    }
}

export default sendEmail