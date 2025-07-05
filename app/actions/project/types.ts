import { Project, ProjectScanType, Url, Tag } from "@prisma/client";

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