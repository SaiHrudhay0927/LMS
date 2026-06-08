import { Schema, model, Types, type InferSchemaType } from 'mongoose';

const batchSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    coordinatorId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    isArchived: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

export type BatchDoc = InferSchemaType<typeof batchSchema> & { _id: Types.ObjectId };
export const Batch = model('Batch', batchSchema);
