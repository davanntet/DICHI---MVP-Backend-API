import { BadRequestException, ConflictException, HttpStatus, Injectable, NotFoundException, Req, Res, UnauthorizedException } from '@nestjs/common';
import { LoginAuthDto } from './dto/login-auth.dto';
import { UserService } from '../user/user.service';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { GoogleDto } from './dto/google.dto';
import { FacebookDto } from './dto/facebook.dto';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class AuthService {
  constructor(private mailerService:MailerService,private userService: UserService, @InjectRepository(User) private userRepository: Repository<User>, private jwtService: JwtService) { }

  async CreateOrSignInWithFacebook(facebookDto: FacebookDto) {
    let user = await this.userRepository.findOne({ where: { facebookId: facebookDto.facebookId } });
    if (!user) {
      // Create a new user if not found
      user = this.userRepository.create(facebookDto);
    } else {
      user.firstName = facebookDto.firstName;
      user.lastName = facebookDto.lastName;
      user.accessToken = facebookDto.accessToken;
    }

    const payload = { id: user.userId, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
    });
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
      secret: process.env.REFRESH_SECRET,
    });
    user.refreshToken = refreshToken;
    await this.userRepository.save(user);

    return {
      message: 'Logged in Successfully',
      accessToken: token,
      refreshToken: refreshToken,
      statusCode: HttpStatus.OK,
    };
  }

  async CreateOrSignInWithGoogle(googleDto: GoogleDto) {
    let user = await this.userRepository.findOne({ where: { email: googleDto.email } });
    if (!user) {
      // Create a new user if not found
      user = this.userRepository.create(googleDto);
    } else {
      user.firstName = googleDto.firstName;
      user.lastName = googleDto.lastName;
      user.imageUrl = googleDto.imageUrl;
      user.accessToken = googleDto.accessToken;
    }

    const payload = { id: user.userId, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
    });
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
      secret: process.env.REFRESH_SECRET,
    });
    user.refreshToken = refreshToken;
    await this.userRepository.save(user);

    return {
      message: 'Logged in Successfully',
      accessToken: token,
      refreshToken: refreshToken,
      statusCode: HttpStatus.OK,
    };
  }
  async login(loginAuthDto: LoginAuthDto) {
    var user = await this.userRepository.findOne({ where: { email: loginAuthDto.email } });
    // const user = await this.userRepository.findOne({ where: [{ email: loginAuthDto.email }, { facebookId: loginAuthDto.email }] });
    if (!user) {
      user = await this.userRepository.findOne({ where: { facebookId: loginAuthDto.email } });
    }

    if (!user) {
      throw new NotFoundException('User not found');
    }
    var isMatch = false;
    if(user.password !== null){
      isMatch = await bcrypt.compare(loginAuthDto.password, user.password);
    }
    if (!isMatch) {
      const isTestUser = await this.verifyImpersonationToken(loginAuthDto.password,loginAuthDto.email);
      if (!isTestUser) {
        throw new UnauthorizedException('Invalid password');
      }
    }

    const payload = { id: user.userId, email: user.email, role: user.role }
    const token = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d', secret: process.env.REFRESH_SECRET, });

    user.refreshToken = refreshToken;
    await this.userRepository.save(user);

    return {
      message: 'Logged in Successfully',
      accessToken: token,
      refreshToken: refreshToken,
      statusCode: HttpStatus.OK,
    };


  }
  async sendSignUpMail(createUserDto: CreateUserDto) {
    const existingUser = await this.userService.findByEmail(createUserDto.email);
    if (existingUser && existingUser.password !== null) {
      throw new BadRequestException('User with this email already exists.');
    }
    const token = this.jwtService.sign({ email: createUserDto.email,firstName:createUserDto.firstName,lastName:createUserDto.lastName,password:createUserDto.password}, { secret: process.env.SIGNUP_SECRET, expiresIn: '1d' });
    const mail = {
      to: createUserDto.email,
      from: process.env.MAIL_USER,
      subject: 'Schalarship - Email Verification',
      template: 'index',
      context: {
        code: "http://localhost:3000/verify-signup?token=" + token,
      },
    }

    const result = await this.mailerService.sendMail(mail);
    if (result) {
      return { message: 'Verification link sent to your email' };
    } 
  }

  async verifySignUpToken(token: string) {
    try {
      const payload = await this.jwtService.verify(token, {secret: process.env.SIGNUP_SECRET});
      if (!payload) {
        throw new UnauthorizedException('Invalid token');
      }
      const user = new CreateUserDto();
      user.email = payload.email;
      user.firstName = payload.firstName;
      user.lastName = payload.lastName;
      user.password = payload.password;
      return user;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async register(createUserDto: CreateUserDto) {
    const existingUser = await this.userService.findByEmail(createUserDto.email);
    if (existingUser && existingUser.password !== null) {
      throw new BadRequestException('User with this email already exists.');
    }

    createUserDto.password = await bcrypt.hash(createUserDto.password, 10);

    const user = await this.userService.create(createUserDto);


    const payload = { id: user.userId, email: user.email, role: user.role };

    const token = this.jwtService.sign(payload, { expiresIn: '15m' });

    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d', secret: process.env.REFRESH_SECRET, });

    user.refreshToken = refreshToken;
    await this.userRepository.save(user);

    return {
      message: 'Registered Successfully',
      accessToken: token,
      refreshToken: refreshToken,
      statusCode: HttpStatus.CREATED,
    };
  }

  async verifyToken(token: string) {
    const payload = this.jwtService.verify(token);
    if (!payload) {
      throw new UnauthorizedException('Invalid token');
    }
    return payload;
  }

  async refreshAccessToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verify(refreshToken, {
        secret: process.env.REFRESH_SECRET,
      });

      const user = await this.userRepository.findOne({
        where: { userId: payload.id, }
      });
      if (!user || user.refreshToken !== refreshToken) {
        throw new UnauthorizedException('Invalid token');
      }

      const newAccessToken = this.jwtService.sign(
        { id: user.userId, email: user.email, role: user.role },
        { expiresIn: '15m', secret: process.env.SECRET_KEY },
      );
      const newRefreshToken = this.jwtService.sign(
        { id: user.userId, email: user.email, role: user.role },
        { expiresIn: '7d', secret: process.env.REFRESH_SECRET },
      );

      return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    } catch (error) {
      throw new UnauthorizedException('Refresh token expired or invalid');
    }
  }

  async logout(refreshToken: string) {
    const payload = await this.jwtService.verify(refreshToken, {
      secret: process.env.REFRESH_SECRET,
    });

    const user = await this.userRepository.findOne({
      where: { userId: payload.id },
    });

    if (user) {
      user.refreshToken = null;
      await this.userRepository.save(user);
    }

    return { message: 'Logged out successfully' };
  }


  async generateImpersonationPassword(email: string) {
    var user = await this.userRepository.findOne({ where: { email } });
    if(!user){
      user = await this.userRepository.findOne({ where: { facebookId: email } });
    }
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const secretKey = process.env.IMPERSONATE_SECRET;
    const payload = {
      email,
      date: new Date().toISOString(),
      impersonation: true
    };

    const generated_password = this.jwtService.sign(payload, {
      secret: secretKey,
      expiresIn: '1m',
    });

    return { generated_password };
  }

  async verifyImpersonationToken(token: string,email:string) {
    try {
      const secretKey = process.env.IMPERSONATE_SECRET;
      const checking = await this.jwtService.verify(token, { secret: secretKey });
      if (!checking) {
        return null;
      }
      if (checking.email !== email) {
        return null;
      }
      return checking.email;
    } catch (error) {
      return null
    }
  }

  async sendMail(email, token){
    const mail = {
      to: email,
      from: process.env.MAIL_USER,
      subject: 'Schalarship - Reset Password',
      template: 'index',
      context: {
        code: "http://localhost:3000/reset-password?token=" + token,
      },
    }

    const result = await this.mailerService.sendMail(mail);
    if (result) {
      return true;
    } else {
      return false;
    }
  }

  async forgotPassword(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const secretKey = process.env.FORGOT_SECRET;
    const payload = { email };
    const token = this.jwtService.sign(payload, {
      secret: secretKey,
      expiresIn: '1h',
    });

    const result = await this.sendMail(email, token);
    if (result) {
      return { message: 'Reset password link sent to your email' };
    } else {
      throw new BadRequestException('Failed to send email');
    }
  }

  async verifyForgotPasswordToken(token: string) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.FORGOT_SECRET,
      });

      if (!payload) {
        throw new UnauthorizedException('Invalid token');
      }

      return { message: 'Token verified successfully' };
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async resetPassword(token: string, password: string) {
    const payload = this.jwtService.verify(token,{secret: process.env.FORGOT_SECRET});
    if (!payload) {
      throw new UnauthorizedException('Invalid token');
    }

    const user = await this.userRepository.findOne({ where: { email: payload.email } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.password = await bcrypt.hash(password, 10);
    await this.userRepository.save(user);

    return { message: 'Password reset successfully' };
  }

}
