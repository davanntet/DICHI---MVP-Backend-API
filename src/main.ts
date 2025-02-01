import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription('The API documentation for the FastAPI and NestJS project')
    .setVersion('1.0')
    .addTag('API')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);
  app.setGlobalPrefix('api/v1');
  await app.listen(process.env.PORT ?? 3000);
  // console.log("🚀 Starting NestJS RabbitMQ Consumer...");
  // const microservice = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
  //   transport: Transport.RMQ,
  //   options: {
  //     urls: ['amqp://admin:davann@localhost:5672'],
  //     queue: 'fastapi_queue',
  //     queueOptions: {
  //       durable: true,
  //     },
  //     noAck: false, 
  //   },
  // });
  // console.log("✅ NestJS is connected to RabbitMQ and listening for messages...");
  // await microservice.listen();
}
bootstrap();
