import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { config } from "../config";
import {
  Department,
  DEPARTMENT_NAMES,
  DepartmentName,
} from "../models/Department";
import { User, Role } from "../models/User";
import { Issue } from "../models/Issue";
import { ActivityLog } from "../models/ActivityLog";
import { Counter } from "../models/Counter";

// Dummy demo password, shared on purpose. Never put real credentials here.
const DEMO_PASSWORD = "Password123";

const ACCOUNTS: {
  displayName: string;
  email: string;
  role: Role;
  department?: DepartmentName;
}[] = [
  { displayName: "Admin User", email: "admin@example.com", role: "ADMIN" },
  {
    displayName: "IT Staff 1",
    email: "it.staff1@example.com",
    role: "STAFF",
    department: "IT Support",
  },
  {
    displayName: "IT Staff 2",
    email: "it.staff2@example.com",
    role: "STAFF",
    department: "IT Support",
  },
  {
    displayName: "Facilities Staff 1",
    email: "fac.staff1@example.com",
    role: "STAFF",
    department: "Facilities",
  },
  {
    displayName: "Facilities Staff 2",
    email: "fac.staff2@example.com",
    role: "STAFF",
    department: "Facilities",
  },
  {
    displayName: "Admin Office Staff 1",
    email: "adm.staff1@example.com",
    role: "STAFF",
    department: "Administration",
  },
  {
    displayName: "Admin Office Staff 2",
    email: "adm.staff2@example.com",
    role: "STAFF",
    department: "Administration",
  },
  {
    displayName: "Reporter A",
    email: "reporter.a@example.com",
    role: "REPORTER",
  },
  {
    displayName: "Reporter B",
    email: "reporter.b@example.com",
    role: "REPORTER",
  },
];

async function main() {
  config.assertEnv();
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10000 });

  if (process.argv.includes("--reset")) {
    await Issue.deleteMany({});
    await Counter.deleteMany({});
    await ActivityLog.collection.deleteMany({}); // raw collection: the model blocks deletes on purpose
    console.log("Reset: removed all issues, activity logs and the ID counter");
  }

  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const deptIds = new Map<string, mongoose.Types.ObjectId>();
  for (const name of DEPARTMENT_NAMES) {
    const d = await Department.findOneAndUpdate(
      { name },
      { $set: { name, active: true } },
      { upsert: true, returnDocument: "after" },
    );
    if (!d) throw new Error(`Could not create department ${name}`);
    deptIds.set(name, d._id);
  }

  // Created in this order, so IT Staff 1 has the lower ID (used for tie-breaks)
  for (const a of ACCOUNTS) {
    await User.findOneAndUpdate(
      { email: a.email },
      {
        $set: {
          displayName: a.displayName,
          role: a.role,
          departmentId: a.department
            ? (deptIds.get(a.department) ?? null)
            : null,
          active: true,
          passwordHash: hash,
        },
      },
      { upsert: true },
    );
  }

  console.log(
    `Seeded ${DEPARTMENT_NAMES.length} departments and ${ACCOUNTS.length} demo accounts`,
  );
  console.table(
    ACCOUNTS.map((a) => ({
      email: a.email,
      role: a.role,
      department: a.department ?? "-",
      password: DEMO_PASSWORD,
    })),
  );
}

main()
  .catch((err) => {
    console.error("Seed failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
