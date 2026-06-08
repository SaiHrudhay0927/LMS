import { Schema, model, Types, type InferSchemaType } from 'mongoose';

const materialSchema = new Schema(
  {
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true, index: true },
    type: { type: String, enum: ['document', 'video', 'link'], required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    filePath: { type: String, default: '' },
    externalUrl: { type: String, default: '' },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

materialSchema.index({ batchId: 1, createdAt: -1 });

export type MaterialDoc = InferSchemaType<typeof materialSchema> & { _id: Types.ObjectId };
export const Material = model('Material', materialSchema);
