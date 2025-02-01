import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { GoogleDto } from 'src/auth/dto/google.dto';

@Injectable()
export class UserService {
  constructor(@InjectRepository(User) private userRepository: Repository<User>){}
  async create(createUserDto: CreateUserDto|GoogleDto): Promise<User> {
    // createUserDto.password = await bcrypt.hash(createUserDto.password, 10);
    const user = this.userRepository.create(createUserDto);
    return this.userRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    const users = await this.userRepository.find();
    return users.map(user => {
      delete user.password;
      return user;
    });
  }
  
  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOne({where: {userId: id.toString()}});
    if(!user) throw new NotFoundException('User not found');
    delete user.password;
    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = this.userRepository.findOne({where: {userId: id.toString()}});
    if(!user) throw new NotFoundException('User not found');
    const updatedUser = this.userRepository.merge(await user, updateUserDto);
    updatedUser.updatedAt = new Date();
    return this.userRepository.save(updatedUser);    
  }

  async remove(id: number): Promise<void> {
    const user = await this.userRepository.findOne({where: {userId: id.toString()}});
    if(!user) throw new NotFoundException('User not found');
    await this.userRepository.remove(user);
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return this.userRepository.findOne({ where: { email } });
  }
}
