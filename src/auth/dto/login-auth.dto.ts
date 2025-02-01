import { IsNotEmpty, Length, Max, MaxLength } from "class-validator";

import { IsEmail } from "class-validator";

export class LoginAuthDto {
  @IsNotEmpty()
  @MaxLength(50)
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MaxLength(50)
  password: string;
}
