import { Schema, model } from "mongoose";

const activityLogSchema = new Schema(
  {
    issueId: {
      type: Schema.Types.ObjectId,
      ref: "Issue",
      required: true,
      index: true,
    },
    actorId: { type: Schema.Types.ObjectId, ref: "User", default: null }, // null = SYSTEM
    action: { type: String, required: true },
    before: { type: Schema.Types.Mixed, default: null },
    after: { type: Schema.Types.Mixed, default: null },
    reason: { type: String, default: null, maxlength: 500 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Append-only: block every update and delete operation
const blocked = [
  "updateOne",
  "updateMany",
  "findOneAndUpdate",
  "findOneAndReplace",
  "replaceOne",
  "deleteOne",
  "deleteMany",
  "findOneAndDelete",
] as const;

for (const op of blocked) {
  activityLogSchema.pre(op as never, function () {
    throw new Error("ActivityLog is append-only");
  });
}

activityLogSchema.pre("save", function () {
  if (!this.isNew) throw new Error("ActivityLog is append-only");
});

export const ActivityLog = model("ActivityLog", activityLogSchema);
