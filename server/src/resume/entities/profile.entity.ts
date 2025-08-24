import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, Index, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { User } from "@resume/entities/user.entity";


@Entity({ name: "profiles" })
export class Profile {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  // Step 1
  @Column({
    type: "jsonb",
    default: () => "'{}'::jsonb",
  })
  basics!: {
    fullName?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedIn?: string;
    github?: string;
    website?: string;
    summary?: string;
  };

  // Step 2
  @Column({
    type: "jsonb",
    default: () => "'[]'::jsonb",
  })
  education!: Array<{
    degree: string;
    institution: string;
    location?: string;
    startDate: string;
    endDate: string;
    gpa?: number;
  }>;

  // Step 3
  @Column({
    type: "jsonb",
    default: () => "'[]'::jsonb",
  })
  experience!: Array<{
    jobTitle: string;
    company: string;
    location?: string;
    startDate: string;
    endDate?: string; // undefined/empty => “Present”
    bullets: string[];
  }>;

  // Step 4
  @Column({
    type: "jsonb",
    default: () => "'[]'::jsonb",
  })
  projects!: Array<{
    title: string;
    liveDemoUrl?: string;
    repoUrl?: string;
    description: string;
    technologies: string[];
  }>;

  // Step 5  ✅ fixed default shape
  @Column({
    type: "jsonb",
    default: () => `'{"items":[]}'::jsonb`,
  })
  skills!: { items: string[] };

  // Relation
  @OneToOne(() => User, (u) => u.profile, { onDelete: "CASCADE" })
  @JoinColumn()
  @Index({ unique: true }) // enforce one profile per user at DB level
  user!: User;

  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
