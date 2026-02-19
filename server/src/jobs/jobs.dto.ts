export interface JobDto {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  descriptionShort: string;
  url: string;
  postedAt: string;
  source: string;
  tags: string[];
}
