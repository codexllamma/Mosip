import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/db";
import { UserRole } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const { email, password, name, role, organization } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { message: "User already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Validate Role (Security check to prevent random strings)
    // Default to EXPORTER if no role provided or invalid role
    const assignedRole = Object.values(UserRole).includes(role) 
      ? role 
      : UserRole.EXPORTER;

    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: assignedRole,
        organization: organization || null,
      },
    });

    return NextResponse.json(
      { 
        message: "User created successfully", 
        user: { id: newUser.id, email: newUser.email, role: newUser.role } 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}