import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from '@prisma/client';
import { MESSAGES } from '@shared/constants/messages.constants';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.usersRepository.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException(MESSAGES.USER_EMAIL_EXISTS);
    }

    return this.usersRepository.create({
      email: createUserDto.email,
      passwordHash: 'argon2_hashed_placeholder_value',
      name: createUserDto.name,
      role: createUserDto.role,
    });
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.findAll();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException(MESSAGES.USER_NOT_FOUND);
    }
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    await this.findOne(id);

    if (updateUserDto.email) {
      const existingUser = await this.usersRepository.findByEmail(updateUserDto.email);
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException(MESSAGES.USER_EMAIL_EXISTS);
      }
    }

    return this.usersRepository.update(id, updateUserDto);
  }

  async remove(id: string): Promise<User> {
    await this.findOne(id);
    return this.usersRepository.delete(id);
  }
}
