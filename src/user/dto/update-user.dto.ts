import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsEmail, IsEnum, IsNotEmpty, IsStrongPassword, MaxLength, MinLength } from 'class-validator';
import { IsString } from 'class-validator';
import { Role } from '../../enums/role.enum';

export class UpdateUserDto extends PartialType(CreateUserDto) {
    @IsString()
    @MaxLength(25)
    firstName: string;

    @IsString()
    @MaxLength(25)
    lastName: string;

    @IsEmail()
    @MaxLength(50)
    email: string;

    @IsString()
    @MaxLength(100)
    @IsStrongPassword()
    password: string;

    @IsEnum(Role)
    role: Role[]
}