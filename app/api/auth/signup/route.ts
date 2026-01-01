import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

// Define valid roles manually to avoid crashing if Prisma Enum is missing
const VALID_ROLES = ["EXPORTER", "QA_AGENCY", "IMPORTER", "ADMIN"];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, name, role } = body;

    if (!email || !password) {
      return NextResponse.json({ message: "Missing email or password" }, { status: 400 });
    }

    // 1. Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    // 2. HEALING LOGIC: Fix the stuck demo user
    if (existingUser) {
      if (email.endsWith("@demo.com")) {
        console.log(`[Demo Fix] Healing user: ${email}`);
        
        const hashedPassword = await bcrypt.hash(password, 12);
        
        // Use the new role if valid, otherwise keep existing
        const roleToAssign = VALID_ROLES.includes(role) 
          ? role 
          : existingUser.role;

        await prisma.user.update({
          where: { email },
          data: {
            password: hashedPassword, // Reset password
            role: roleToAssign,       // Ensure correct role
            name: name || existingUser.name,
          },
        });

        // Return 200 OK so frontend retries login
        return NextResponse.json({ message: "Demo user healed" }, { status: 200 });
      }

      // Real users get error
      return NextResponse.json({ message: "User already exists" }, { status: 409 });
    }

    // 3. Create New User
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Default to EXPORTER if role is invalid/missing
    const roleToAssign = VALID_ROLES.includes(role) ? role : "EXPORTER";

    const newUser = await prisma.user.create({
      data: {
        email,
        name: name || "New User",
        password: hashedPassword,
        role: roleToAssign,
      },
    });

    return NextResponse.json(
      { message: "User created", user: { id: newUser.id, email: newUser.email } },
      { status: 201 }
    );

  } catch (error: any) {
    console.error("[Signup Error]:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}