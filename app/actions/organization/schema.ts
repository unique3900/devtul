import { z } from "zod";
import { OrganizationType, OrganizationSize } from "@prisma/client";

export const organizationCreateSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  logo: z.any().optional().refine((val) => {
    if (!val) return true; // Optional field
    // Check if it's a File instance or has File-like properties
    return val instanceof File || (typeof val === 'object' && val && 'name' in val);
  }, "Invalid file object"),
  website: z.string().optional().refine((val) => {
    if (!val) return true; // Optional field
    try {
      new URL(val.startsWith('http') ? val : `https://${val}`);
      return true;
    } catch {
      return false;
    }
  }, "Invalid website URL"),
  type: z.string().min(1, "Organization type is required").transform((val) => {
    // Convert to proper case to match enum values
    const capitalized = val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
    return capitalized as OrganizationType;
  }).refine((val) => Object.values(OrganizationType).includes(val), {
    message: `Invalid organization type. Must be one of: ${Object.values(OrganizationType).join(", ")}`
  }),
  size: z.string().optional().transform((val) => {
    if (!val) return undefined;
    return val as OrganizationSize;
  }).refine((val) => !val || Object.values(OrganizationSize).includes(val), {
    message: `Invalid organization size. Must be one of: ${Object.values(OrganizationSize).join(", ")}`
  }),
  password: z.string().min(1, "Password is required"),  
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms and conditions"
  }),
  contactName: z.string().min(1, "Contact name is required"),
  contactEmail: z.string().email("Invalid email address"),
});

