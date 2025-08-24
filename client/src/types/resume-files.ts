export type ResumeFile = {
  fileName: string;
  url: string;
  size: number;
  mtimeMs: number;
  ext: string;
  version?: number;
};

export type FilesResponse = {
  resumes: ResumeFile[];
  coverLetters: ResumeFile[];
};
