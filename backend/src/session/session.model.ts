import mongoose, { Schema } from "mongoose"
import { Document, Types } from "mongoose"
export interface Session extends Document {
    userId: Types.ObjectId
    refreshTokenHash: String,
    ip: String,
    userAgent: String,
    revoked: Boolean
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
    }, {
    timestamps: true
}
)
sessionSchema.index({ refreshTokenHash: 1 }, { unique: true }); //token refresh
sessionSchema.index({ userId: 1, revoked: 1 });//users active sessions
sessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 }) //auto delete expired sessions

const sessionModel = mongoose.model<Session>("Session", sessionSchema)
export default sessionModel