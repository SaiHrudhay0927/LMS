import { Schema, model, Types, type InferSchemaType } from 'mongoose';

const messageSchema = new Schema(
  {
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, trim: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

messageSchema.index({ senderId: 1, recipientId: 1, createdAt: -1 });
messageSchema.index({ recipientId: 1, readAt: 1 });

export type MessageDoc = InferSchemaType<typeof messageSchema> & { _id: Types.ObjectId };
export const Message = model('Message', messageSchema);
