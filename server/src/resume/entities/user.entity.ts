import { Column, CreateDateColumn, Entity, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Profile } from "@resume/entities/profile.entity";

export enum UserRole {
  USER = "user",
  ADMIN = "admin",
}

@Entity()
export class User {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ unique: true }) email!: string;
  @Column({ nullable: true, select: false }) password!: string;
  @Column({ type: "enum", enum: UserRole, default: UserRole.USER }) role!: UserRole;

  @OneToOne(() => Profile, (p) => p.user, { cascade: true })
  profile?: Profile;

  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}
