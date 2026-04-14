// In-memory user store — good enough for a hackathon demo.
// In production, replace with TypeORM + PostgreSQL.

export interface User {
  id: string;
  email: string;
  passwordHash: string;

  // Custodial wallet — generated at signup, user never sees this
  walletAddress: string;
  encryptedPrivateKey: string; // AES-encrypted with APP_SECRET

  // NFT ownership
  ownedTokenIds: number[];

  // Profile
  displayName: string;
  createdAt: string;
}

// Simple in-memory store
class UserStore {
  private users: Map<string, User> = new Map(); // id → User
  private emailIndex: Map<string, string> = new Map(); // email → id

  create(user: User): User {
    this.users.set(user.id, user);
    this.emailIndex.set(user.email.toLowerCase(), user.id);
    return user;
  }

  findById(id: string): User | undefined {
    return this.users.get(id);
  }

  findByEmail(email: string): User | undefined {
    const id = this.emailIndex.get(email.toLowerCase());
    return id ? this.users.get(id) : undefined;
  }

  update(id: string, patch: Partial<User>): User | undefined {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated = { ...user, ...patch };
    this.users.set(id, updated);
    return updated;
  }

  addTokenToUser(userId: string, tokenId: number): void {
    const user = this.users.get(userId);
    if (user && !user.ownedTokenIds.includes(tokenId)) {
      user.ownedTokenIds.push(tokenId);
    }
  }

  getAll(): User[] {
    return Array.from(this.users.values());
  }
}

// Singleton export — shared across all services
export const userStore = new UserStore();
