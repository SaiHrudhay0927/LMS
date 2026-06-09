import { Schema, model, Types, type InferSchemaType } from 'mongoose';

const chatroomSchema = new Schema(
  {
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    hostId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    memberIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      default: [],
      index: true,
    },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true },
);

chatroomSchema.index({ memberIds: 1, updatedAt: -1 });

export type ChatroomDoc = InferSchemaType<typeof chatroomSchema> & { _id: Types.ObjectId };
export const Chatroom = model('Chatroom', chatroomSchema);
