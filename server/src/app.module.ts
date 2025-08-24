import { Module } from "@nestjs/common";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "path";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppController } from "@app/app.controller";
import { AppService } from "@app/app.service";
import { ResumeModule } from "@resume/resume.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
    ResumeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
