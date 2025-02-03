import { IsNotEmpty, Length, Max, MaxLength, MinLength } from "class-validator";

import { IsEmail } from "class-validator";

export class LoginAuthDto {
  @IsNotEmpty()
  @MaxLength(50)
  email: string;

  @IsNotEmpty()
  @MinLength(8)
  password: string;
}
