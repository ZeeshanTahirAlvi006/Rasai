// src/user/user.model.ts
// Mongoose schema and model for registered merchant user accounts with bcrypt password hashing and unverified TTL.
import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcrypt";

export interface User extends Document {
    username: string;
    email: string;
    password: string;
    verified: Boolean;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(password: string): Promise<Boolean>;
}

const userSchema = new Schema<User>(
    {
        username: {
            type: String,
            required: [true, "Username is required"],
            minLength: [6, "username must be atleast 6 characters"],
            maxLength: [20, "username can not be more than 20 characters"],
            trim: true
        },
        email: {
            type: String,
            required: [true, "email is required"],
            unique: true,
            trim: true
        },
        password: {
            type: String,
            required: [true, "password is required"],
            minLength: [8, "password must be atleast 8 characters"],
            trim: true,
            select: false
        },
        verified: {
            type: Boolean,
            required: [true, "verfied status is required"],
            default: false
        }
    },
    {
        timestamps: true // Guarantees createdAt exists for the partial TTL index below (B2-DB-01)
    }
);

userSchema.pre<User>("save", async function (this: User) {
    if (!this.isModified("password")) return;
    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
        throw error;
    }
});

userSchema.methods.comparePassword = async function (this: User, password: string): Promise<Boolean> {
    try {
        return await bcrypt.compare(password, this.password);
    } catch (error) {
        return false;
    }
};

userSchema.index({ username: 1 }, { unique: true });
// Unverified users expire after 3 days (Spec §3.4)
userSchema.index(
    { createdAt: 1 },
    {
        expireAfterSeconds: 259200,
        partialFilterExpression: { verified: false }
    }
);

const userModel = mongoose.model<User>("User", userSchema);
export default userModel;
