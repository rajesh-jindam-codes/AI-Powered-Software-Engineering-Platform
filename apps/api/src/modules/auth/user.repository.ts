import { Injectable } from '@nestjs/common';
import { User, UserRole, UserStatus, UserWithPassword } from '@devflow/shared-types';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UserRepository {
  private readonly users = new Map<string, UserWithPassword>();
  private readonly usersByEmail = new Map<string, string>(); // email (lowercased) -> id
  private readonly revokedRefreshTokens = new Set<string>();
  private readonly activeRefreshTokens = new Map<string, string>(); // token -> userId

  constructor() {
    this.seedDefaultUsers();
  }

  private seedDefaultUsers(): void {
    const saltRounds = 10;
    const defaultPasswordHash = bcrypt.hashSync('DevFlow2026!', saltRounds);

    const seedUsers: Array<{
      email: string;
      name: string;
      role: UserRole;
    }> = [
      {
        email: 'admin@devflow.ai',
        name: 'Lead System Architect',
        role: 'ADMIN',
      },
      {
        email: 'developer@devflow.ai',
        name: 'Senior Full-Stack Engineer',
        role: 'DEVELOPER',
      },
      {
        email: 'reviewer@devflow.ai',
        name: 'Staff Code Reviewer',
        role: 'REVIEWER',
      },
      {
        email: 'viewer@devflow.ai',
        name: 'Product Stakeholder',
        role: 'VIEWER',
      },
    ];

    for (const seed of seedUsers) {
      const id = uuidv4();
      const user: UserWithPassword = {
        id,
        email: seed.email.toLowerCase(),
        name: seed.name,
        role: seed.role,
        status: 'ACTIVE',
        passwordHash: defaultPasswordHash,
        avatarUrl: `https://api.dicebear.com/8.x/bottts/svg?seed=${seed.name.replace(/\s+/g, '')}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.users.set(id, user);
      this.usersByEmail.set(user.email, id);
    }
  }

  async findById(id: string): Promise<UserWithPassword | null> {
    const user = this.users.get(id);
    return user ? { ...user } : null;
  }

  async findByEmail(email: string): Promise<UserWithPassword | null> {
    const id = this.usersByEmail.get(email.toLowerCase().trim());
    if (!id) return null;
    return this.findById(id);
  }

  async create(data: {
    email: string;
    name: string;
    password: string;
    role?: UserRole;
  }): Promise<User> {
    const emailKey = data.email.toLowerCase().trim();
    if (this.usersByEmail.has(emailKey)) {
      throw new Error('DUPLICATE_EMAIL');
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const id = uuidv4();
    const userWithPassword: UserWithPassword = {
      id,
      email: emailKey,
      name: data.name.trim(),
      role: data.role || 'DEVELOPER',
      status: 'ACTIVE',
      passwordHash,
      avatarUrl: `https://api.dicebear.com/8.x/bottts/svg?seed=${data.name.replace(/\s+/g, '')}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.users.set(id, userWithPassword);
    this.usersByEmail.set(emailKey, id);

    return this.sanitizeUser(userWithPassword);
  }

  async updateProfile(
    id: string,
    updates: { name?: string; avatarUrl?: string },
  ): Promise<User | null> {
    const user = this.users.get(id);
    if (!user) return null;

    if (updates.name !== undefined) user.name = updates.name.trim();
    if (updates.avatarUrl !== undefined) user.avatarUrl = updates.avatarUrl;
    user.updatedAt = new Date().toISOString();

    this.users.set(id, user);
    return this.sanitizeUser(user);
  }

  async updateStatus(id: string, status: UserStatus): Promise<boolean> {
    const user = this.users.get(id);
    if (!user) return false;

    user.status = status;
    user.updatedAt = new Date().toISOString();
    this.users.set(id, user);
    return true;
  }

  async updatePasswordHash(id: string, newPasswordHash: string): Promise<boolean> {
    const user = this.users.get(id);
    if (!user) return false;

    user.passwordHash = newPasswordHash;
    user.updatedAt = new Date().toISOString();
    this.users.set(id, user);
    return true;
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
  }

  storeRefreshToken(token: string, userId: string): void {
    this.activeRefreshTokens.set(token, userId);
  }

  getUserIdByRefreshToken(token: string): string | null {
    if (this.revokedRefreshTokens.has(token)) return null;
    return this.activeRefreshTokens.get(token) || null;
  }

  revokeRefreshToken(token: string): void {
    this.activeRefreshTokens.delete(token);
    this.revokedRefreshTokens.add(token);
  }

  sanitizeUser(user: UserWithPassword): User {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }
}
