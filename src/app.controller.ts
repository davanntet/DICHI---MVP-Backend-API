import { Controller, Get, Logger } from '@nestjs/common';
import { AppService } from './app.service';
import { Ctx, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { MailerService } from '@nestjs-modules/mailer';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private readonly appService: AppService, private readonly mailerServer: MailerService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }


  @MessagePattern('fastapi_queue')
  handleRabbitMQMessage(@Payload() message: any, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef(); // Get RabbitMQ channel
    const originalMessage = context.getMessage(); // Get the message object

    this.logger.log(`📩 Received message from RabbitMQ: ${JSON.stringify(message)}`);

    // 👇 Acknowledge the message after processing it
    channel.ack(originalMessage);
  }
}
