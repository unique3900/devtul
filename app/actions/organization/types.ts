import { OrganizationType, OrganizationSize, UserAccountType } from "@prisma/client";

export interface OrganizationCreateData {
  name: string;
  slug: string;
  type: OrganizationType;
  acceptTerms: boolean;
  contactName: string;
  contactEmail: string;
  website?: string;
  size?: OrganizationSize;
  logo?: string;
  accountType: UserAccountType;
}

export interface OrganizationCreateInput {
  name: string;
  logo?: File;
  website?: string;
  type: string; // Will be transformed to OrganizationType
  size?: string; // Will be transformed to OrganizationSize
  password: string;
  acceptTerms: boolean;
  contactName: string;
  contactEmail: string;
}
