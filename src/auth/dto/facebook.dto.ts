import { IsOptional } from "class-validator";

export class FacebookDto {
facebookId: string;
  firstName: string;
  lastName: string;
  accessToken: string;
  @IsOptional()
    email: string;
}