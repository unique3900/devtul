"use server";

import { z } from "zod";
import { organizationCreateSchema } from "./schema";
import { OrganizationCreateInput } from "./types";

export async function createOrganization(data: OrganizationCreateInput) {
  try {
    const parseResult = organizationCreateSchema.safeParse(data);
    if (!parseResult.success) {
      return {
        success: false,
        status: 400,
        message: parseResult.error.message
      };
    }

    // Prepare data for API call - convert File to serializable format
    const apiData = {
      ...parseResult.data,
      logo: parseResult.data.logo ? {
        name: parseResult.data.logo.name,
        size: parseResult.data.logo.size,
        type: parseResult.data.logo.type
      } : undefined
    };

    // Determine API URL - use environment variables or default to localhost
    let baseUrl = 'http://localhost:3000';
    
    if (process.env.NEXTAUTH_URL) {
      baseUrl = process.env.NEXTAUTH_URL;
    } else if (process.env.VERCEL_URL) {
      baseUrl = `https://${process.env.VERCEL_URL}`;
    }

    // Make API call to the signup route
    const response = await fetch(`${baseUrl}/api/v1/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiData),
    });

    const result = await response.json();

    if (result.success === false) {
      return {
        success: false,
        status: response.status,
        message: result.message || result.error || 'Failed to create organization'
      };
    }
    console.log(result,"result");
    return {
      success: true,
      status: response.status,
      message: "Organization created successfully",
      data: result
    };
  } catch (error) {
    console.error("Organization creation error:", error);
    
    if (error instanceof Error) {
      return {
        success: false,
        status: 500,
        message: error.message
      };
    }
    
    return {
      success: false,
      status: 500,
      message: "An unexpected error occurred. Please try again."
    };
  }
}
