import { z } from "zod";

const scanFrequencyEnum = z.enum(["Hourly", "Daily", "Weekly", "Monthly", "Manual"]);

export const projectCreateSchema = z.object({
  name: z.string().min(1, "Project name is required").max(100, "Project name must be less than 100 characters"),
  url: z.string().url("Please enter a valid URL"),
  description: z.string().optional(),
  category: z.string().optional(),
  scanFrequency: scanFrequencyEnum.default("Daily"),
  enabledTools: z.object({
    security: z.boolean().default(false),
    seo: z.boolean().default(false),
    accessibility: z.boolean().default(false),
    performance: z.boolean().default(false),
    uptime: z.boolean().default(false),
    ssl: z.boolean().default(false),
  }),
  tags: z.array(z.string()).default([]),
  additionalUrls: z.array(z.string().url("Please enter valid URLs")).optional(),
  organizationId: z.string().optional(),
});

export const sitemapImportSchema = z.object({
  sitemapUrl: z.string().url("Please enter a valid sitemap URL"),
});

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
export type SitemapImportInput = z.infer<typeof sitemapImportSchema>; 