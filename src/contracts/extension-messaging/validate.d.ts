export type AiCapturePayload = {
  role: string;
  company: string;
  country: string;
  workType: string;
  platform: string;
  notes: string;
  jobLink: string;
  allowDuplicate: boolean;
};

export type RuntimeMessage = {
  action: string;
  payload?: AiCapturePayload;
  path?: string;
  isFullscreen?: boolean;
  success?: boolean;
  duplicate?: boolean;
  error?: string;
  existing?: {
    id?: string;
    role?: string;
    company?: string;
    date_applied?: string;
  };
};

export function parseAiCapturePayload(payload: unknown): AiCapturePayload | null;
export function parseNavigatePath(path: unknown): string | null;
export function parseRuntimeMessage(raw: unknown): RuntimeMessage | null;