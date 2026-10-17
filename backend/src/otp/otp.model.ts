import mongoose, { Types, Schema, Document } from "mongoose"

export interface Otp extends Document {
    email: String,
    user: Types.ObjectId,
    otpHash: String,
    reason: String,
    createdAt: Date,
    updatedAt: Date
}

const otpSchema = new Schema<Otp>(
    {
        email: {
            type: String,
            required: [true, "email is requied"]
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
    }, {
    timestamps: true
}
)
otpSchema.index({ otpHash: 1, reason: 1, createdAT: -1 })
otpSchema.index({ user: 1, reason: 1, createdAt: -1 })
otpSchema.index({ email: 1, reason: 1, createdAt: -1 }) // if looking by email and reason
otpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 600 }) //auto delete after 10 min

const otpModel = mongoose.model<Otp>("otp", otpSchema)
export default otpModel