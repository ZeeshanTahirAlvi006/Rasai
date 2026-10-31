// src/session/session.model.ts
// Mongoose schema and model for authenticated user refresh sessions with 7-day TTL expiration.
import mongoose, { Schema, Document, Types } from "mongoose";

export interface Session extends Document {
    userId: Types.ObjectId;
    refreshTokenHash: string;
    ip: string;
    userAgent: string;
    revoked: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const sessionSchema = new Schema<Session>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            required: [true, "user id is required"],
            ref: "users"
        },
        refreshTokenHash: {
            type: String,
            required: [true, "refresh token hash is required"]
        },
        ip: {
            type: String,
            required: [true, "ip address is required"]
        },
        userAgent: {
            type: String,
            required: [true, "user agent is required"]
        },
        revoked: {
            type: Boolean,
            required: [true, "revoked is required"],
            default: false
        }
    },
    {
        timestamps: true
    }
);

sessionSchema.index({ refreshTokenHash: 1 }, { unique: true }); // Token refresh index
sessionSchema.index({ userId: 1, revoked: 1 }); // User's active sessions index
sessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 }); // Auto-delete expired sessions after 7 days (Spec §3.4)

const sessionModel = mongoose.model<Session>("Session", sessionSchema);
export default sessionModel;
