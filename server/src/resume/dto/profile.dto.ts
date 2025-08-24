import { Type } from "class-transformer";
import {
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
  IsNumber,
} from "class-validator";

/** Step 1 — Personal Information */
class BasicsDto {
  @IsString() fullName!: string;
  @IsEmail() email!: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() location?: string;

  @IsOptional() @IsUrl({ require_protocol: true }) linkedIn?: string;
  @IsOptional() @IsUrl({ require_protocol: true }) github?: string;
  @IsOptional() @IsUrl({ require_protocol: true }) website?: string;

  @IsOptional() @IsString() summary?: string; // “Professional Summary”
}

/** Step 2 — Education */
class EducationDto {
  @IsString() degree!: string;
  @IsString() institution!: string;
  @IsOptional() @IsString() location?: string;

  // Accept any string like "Aug, 2010" for now; you can normalize later
  @IsString() startDate!: string;
  @IsString() endDate!: string;

  @IsOptional() @IsNumber({}, { each: false } as any) gpa?: number;
}

/** Step 3 — Work Experience */
class ExperienceDto {
  @IsString() jobTitle!: string;
  @IsString() company!: string;
  @IsOptional() @IsString() location?: string;

  @IsString() startDate!: string;
  // Allow "Present" or empty; renderer will handle it
  @IsOptional() @IsString() endDate?: string;

  // The UI shows a textarea with bullet lines — we save as array
  @IsArray() @IsString({ each: true }) bullets!: string[];
}

/** Step 4 — Projects */
class ProjectDto {
  @IsString() title!: string;
  @IsOptional() @IsUrl({ require_protocol: true }) liveDemoUrl?: string;
  @IsOptional() @IsUrl({ require_protocol: true }) repoUrl?: string;

  @IsString() description!: string;

  // “Technologies Used” tags (chips)
  @IsArray() @IsString({ each: true }) technologies!: string[];
}

/** Step 5 — Skills */
class SkillsDto {
  @IsArray() @IsString({ each: true }) items!: string[];
}

export class UpsertProfileDto {
  @ValidateNested() @Type(() => BasicsDto) basics!: BasicsDto;

  @IsArray() @ValidateNested({ each: true }) @Type(() => EducationDto)
  education!: EducationDto[];

  @IsArray() @ValidateNested({ each: true }) @Type(() => ExperienceDto)
  experience!: ExperienceDto[];

  @IsArray() @ValidateNested({ each: true }) @Type(() => ProjectDto)
  projects!: ProjectDto[];

  @ValidateNested() @Type(() => SkillsDto) skills!: SkillsDto;
}
