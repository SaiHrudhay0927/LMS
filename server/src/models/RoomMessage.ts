import { Schema, model, Types, type InferSchemaType } from 'mongoose';

const roomMessageSchema = new Schema(
  {
    roomId: { type: Schema.Types.ObjectId, ref: 'Chatroom', required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, trim: true, maxlength: 4000 },
    isAI: { type: Boolean, default: false },
  },
  { timestamps: true },
);

roomMessageSchema.index({ roomId: 1, createdAt: 1 });

export type RoomMessageDoc = InferSchemaType<typeof roomMessageSchema> & {
  _id: Types.ObjectId;
};
export const RoomMessage = model('RoomMessage', roomMessageSchema);
