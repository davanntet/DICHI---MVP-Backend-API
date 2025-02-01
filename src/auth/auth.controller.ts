import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request, HttpStatus, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { GoogleOAuthGuard } from './google-oauth.guard';
import { AuthGuard } from '@nestjs/passport';
import { GoogleDto } from './dto/google.dto';
import { FacebookOAuthGuard } from './facebook-oauth.guard';
import { FacebookDto } from './dto/facebook.dto';

@Controller('/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/register')
  register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @Post('/login')
  login(@Body() loginAuthDto: LoginAuthDto) {
    return this.authService.login(loginAuthDto);
  }

  @Get('/verify')
  verify(@Query('token') token: string) {
    return this.authService.verifyToken(token);
  }

  @Post('/refresh')
  async refresh(@Query('refreshToken') refreshToken: string) {
    return this.authService.refreshAccessToken(refreshToken);
  }

  @Post('/logout')
  async logout(@Body('refreshToken') refreshToken: string) {
    return this.authService.logout(refreshToken);
  }
  @Get('generate')
  generateImpersonationPassword(@Query('email') email: string): { password: string } {
    if (!email) {
      return { password: 'Email is required' };
    }

    const password = this.authService.generateImpersonationPassword(email);
    return { password };
  }

  @Get("/google")
  @UseGuards(GoogleOAuthGuard)
  async googleAuth(@Request() req) {}

  @Get('/oauth-google')
  @UseGuards(GoogleOAuthGuard)
  googleAuthRedirect(@Request() req) {
     const user = req.user;
     const googleDto = new GoogleDto();
      googleDto.email = user.email;
      googleDto.firstName = user.firstName;
      googleDto.lastName = user.lastName;
      googleDto.imageUrl = user.picture;
      googleDto.accessToken = user.accessToken;
    const response = this.authService.CreateOrSignInWithGoogle(googleDto);
    return response;
  }
  @Get("/facebook")
  @UseGuards(FacebookOAuthGuard)
  async facebookLogin(@Request() req){
  }

  @Get("/oauth-facebook")
  @UseGuards(FacebookOAuthGuard)
  async facebookLoginRedirect(@Request() req) {
    const user = req.user;
    const facebookDto = new FacebookDto();
    facebookDto.facebookId = user.id;
    facebookDto.email = user.email;
    facebookDto.firstName = user.firstName;
    facebookDto.lastName = user.lastName;
    facebookDto.accessToken = user.accessToken;
    const response = this.authService.CreateOrSignInWithFacebook(facebookDto);
    return response;
  }
  
  @Post("/forgot-password")
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Post("/verify-forgot-token")
  async verifyForgotToken(@Body('token') token: string) {
    return this.authService.verifyForgotPasswordToken(token);
  }

  @Post("/reset-password")
  async resetPassword(@Body('token') token: string, @Body('password') password: string) {
    return this.authService.resetPassword(token, password);
  }
}
