import { Module } from "@nestjs/common";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "path";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule } from "@nestjs/bullmq";
import { AppController } from "@app/app.controller";
import { AppService } from "@app/app.service";
import { ResumeModule } from "@resume/resume.module";
import { JobsModule } from "./jobs/jobs.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { AuthModule } from "./auth/auth.module";
import { AdminModule } from "./admin/admin.module";
import { WorkflowModule } from "./workflow/workflow.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? "localhost",
        port: parseInt(process.env.REDIS_PORT ?? "6379", 10),
      },
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), "generated"),
      serveRoot: "/static",
      serveStaticOptions: {
        setHeaders: (res, path) => {
          if (path.endsWith(".pdf")) res.setHeader("Content-Type", "application/pdf");
          if (path.endsWith(".docx"))
            res.setHeader(
              "Content-Type",
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            );
          res.setHeader("Cache-Control", "public, max-age=3600");
        },
      },
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: "postgres",
        url: process.env.DATABASE_URL,
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
    AuthModule,
    ResumeModule,
    JobsModule,
    DashboardModule,
    AdminModule,
    WorkflowModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
