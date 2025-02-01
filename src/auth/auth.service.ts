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

@Injectable()
export class AuthService {
  constructor(private userService: UserService, @InjectRepository(User) private userRepository: Repository<User>, private jwtService: JwtService) { }

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
      access_token: token,
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
      access_token: token,
      refreshToken: refreshToken,
      statusCode: HttpStatus.OK,
    };
  }
  async login(loginAuthDto: LoginAuthDto) {
    const user = await this.userRepository.findOne({ where: { email: loginAuthDto.email } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const isMatch = await bcrypt.compare(loginAuthDto.password, user.password);
    if (!isMatch) {
      const isTestUser = this.verifyImpersonationToken(loginAuthDto.password);
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
      access_token: token,
      refreshToken: refreshToken,
      statusCode: HttpStatus.OK,
    };


  }
  async register(createUserDto: CreateUserDto) {
    const existingUser = await this.userService.findByEmail(createUserDto.email);
    if (existingUser) {
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
      access_token: token,
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

      return { access_token: newAccessToken };
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


  generateImpersonationPassword(email: string): string {
    const secretKey = process.env.SECRET_KEY;

    const payload = {
      email,
      date: new Date().toISOString(),
    };

    return this.jwtService.sign(payload, {
      secret: secretKey,
      expiresIn: '1m',
    });
  }

  verifyImpersonationToken(token: string): any {
    try {
      const secretKey = process.env.SECRET_KEY;
      return this.jwtService.verify(token, { secret: secretKey });
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

}
