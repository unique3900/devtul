import { Project, ProjectScanType, Url, Tag } from "@prisma/client";
import { z } from "zod";
import { projectCreateSchema } from "./schema";

export type ProjectFormData = z.infer<typeof projectCreateSchema>;

export type ProjectWithRelations = Project & {
  urls: Url[];
  projectScanTypes: ProjectScanType[];
  projectTags: {
    tag: Tag;
  }[];
  _count: {
    urls: number;
    scans: number;
  };
};

export type ProjectCreateResult = {
  success: boolean;
  project?: ProjectWithRelations;
  error?: string;
};

export type SitemapImportResult = {
  success: boolean;
  urls?: string[];
  error?: string;
}; 