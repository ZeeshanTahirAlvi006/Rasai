// src/otp/otp.model.ts
// Mongoose schema and model for verification OTP hashes with 10-minute TTL expiration.
import mongoose, { Types, Schema, Document } from "mongoose";

export interface Otp extends Document {
    email: string;
    user: Types.ObjectId;
    otpHash: string;
    reason: string;
    createdAt: Date;
    updatedAt: Date;
}

const otpSchema = new Schema<Otp>(
    {
        email: {
            type: String,
            required: [true, "email is required"]
        },
        user: {
            type: Schema.Types.ObjectId,
            required: [true, "user id is required"]
        },
        otpHash: {
            type: String,
            required: [true, "otp hash is required"]
        },
        reason: {
            type: String,
            required: [true, "reason is required"],
            default: "verify_user"
        }
    },
    {
        timestamps: true
    }
);

otpSchema.index({ otpHash: 1, reason: 1, createdAt: -1 }); // Fixed typo createdAT -> createdAt (B2-DB-02)
otpSchema.index({ user: 1, reason: 1, createdAt: -1 });
otpSchema.index({ email: 1, reason: 1, createdAt: -1 });
otpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 600 }); // Auto-delete expired OTPs after 10 min (Spec §3.4)

const otpModel = mongoose.model<Otp>("otp", otpSchema);
export default otpModel;
