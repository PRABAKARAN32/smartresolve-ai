import { Schema, model } from "mongoose";

const counterSchema = new Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

export const Counter = model("Counter", counterSchema);

export async function nextPublicId(): Promise<string> {
  const c = await Counter.findOneAndUpdate(
    { _id: "issue" },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" },
  );
  if (!c) throw new Error("Could not generate issue ID");
  return `SR-${String(c.seq).padStart(6, "0")}`;
}
