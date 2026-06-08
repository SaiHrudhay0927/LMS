import { Schema, model, Types, type InferSchemaType } from 'mongoose';

const responseSchema = new Schema(
  {
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, trim: true },
    at: { type: Date, default: Date.now },
  },
  { _id: true },
);

const doubtSchema = new Schema(
  {
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    materialId: { type: Schema.Types.ObjectId, ref: 'Material', default: null },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    status: { type: String, enum: ['open', 'resolved'], default: 'open', index: true },
    responses: { type: [responseSchema], default: [] },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

doubtSchema.index({ batchId: 1, status: 1, createdAt: -1 });

export type DoubtDoc = InferSchemaType<typeof doubtSchema> & { _id: Types.ObjectId };
export const Doubt = model('Doubt', doubtSchema);
