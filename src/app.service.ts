import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  constructor(private readonly mailerService: MailerService){}
  getHello(): string {
    return 'Hello World!9';
  }

  async sendMail(email, code){
    const mail = {
      to: email,
      from: process.env.MAIL_USER,
      subject: 'Schalarship - verification code',
      template: 'index',
      context: {
        code: code,
      },
    }
    const result = await this.mailerService.sendMail(mail);
    if (result) {
      return true;
    } else {
      return false;
    }
  }
}
