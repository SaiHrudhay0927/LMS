import { Schema, model, Types, type InferSchemaType } from 'mongoose';

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    avatarUrl: { type: String, default: '' },
    role: { type: String, enum: ['admin', 'coordinator', 'student'], required: true, index: true },
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch', default: null, index: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// Single-batch rule: only students may have a batchId.
userSchema.pre('validate', function (next) {
  if (this.role !== 'student' && this.batchId) {
    return next(new Error('Only students may have a batchId.'));
  }
  next();
});

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: Types.ObjectId };
export const User = model('User', userSchema);
