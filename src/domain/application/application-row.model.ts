export interface ApplicationRow {
  id: string;
  role: string;
  company: string;
  platform: string;
  job_link: string;
  company_link: string;
  date_applied: string;
  status: string;
  interview_date: string;
  notes: string;
  country: string;
  work_type: string;
}

export type CreateApplicationInput = Omit<ApplicationRow, 'id' | 'interview_date'> &
  Partial<Pick<ApplicationRow, 'id' | 'interview_date'>>;

export type AiCapturedApplicationInput = {
  role?: string;
  company?: string;
  platform?: string;
  jobLink?: string;
  notes?: string;
  country?: string;
  workType?: string;
  allowDuplicate?: boolean;
};

export type CreateApplicationOptions = {
  allowDuplicate?: boolean;
};
