import { 
  User, 
  PlatformAccount, 
  AutomationTask, 
  ScheduledPost,
  TaskExecution,
  SocialPlatform 
} from './types'

// ==================== IN-MEMORY DATABASE ====================
// In production, this would be replaced with Neon PostgreSQL queries

class InMemoryDB {
  private users: Map<string, User> = new Map()
  private accounts: Map<string, PlatformAccount> = new Map()
  private tasks: Map<string, AutomationTask> = new Map()
  private posts: Map<string, ScheduledPost> = new Map()
  private executions: Map<string, TaskExecution> = new Map()

  // ==================== USER OPERATIONS ====================
  
  async getUser(userId: string): Promise<User | null> {
    return this.users.get(userId) || null
  }

  async createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const newUser: User = {
      id: crypto.randomUUID(),
      ...user,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.users.set(newUser.id, newUser)
    return newUser
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    const user = this.users.get(userId)
    if (!user) return null
    
    const updated = { ...user, ...updates, updatedAt: new Date() }
    this.users.set(userId, updated)
    return updated
  }

  // ==================== ACCOUNT OPERATIONS ====================

  async getUserAccounts(userId: string): Promise<PlatformAccount[]> {
    return Array.from(this.accounts.values()).filter(a => a.userId === userId)
  }

  async getAccount(accountId: string): Promise<PlatformAccount | null> {
    return this.accounts.get(accountId) || null
  }

  async createAccount(account: Omit<PlatformAccount, 'id' | 'createdAt' | 'updatedAt'>): Promise<PlatformAccount> {
    const newAccount: PlatformAccount = {
      id: crypto.randomUUID(),
      ...account,
      createdAt: new Date(),
      updatedAt: new Date(),
      errorCount: 0,
    }
    this.accounts.set(newAccount.id, newAccount)
    return newAccount
  }

  async updateAccount(accountId: string, updates: Partial<PlatformAccount>): Promise<PlatformAccount | null> {
    const account = this.accounts.get(accountId)
    if (!account) return null
    
    const updated = { ...account, ...updates, updatedAt: new Date() }
    this.accounts.set(accountId, updated)
    return updated
  }

  async deleteAccount(accountId: string): Promise<boolean> {
    return this.accounts.delete(accountId)
  }

  async getAccountsByPlatform(userId: string, platform: SocialPlatform): Promise<PlatformAccount[]> {
    return Array.from(this.accounts.values()).filter(
      a => a.userId === userId && a.platform === platform && a.isActive
    )
  }

  // ==================== TASK OPERATIONS ====================

  async getUserTasks(userId: string): Promise<AutomationTask[]> {
    return Array.from(this.tasks.values()).filter(t => t.userId === userId)
  }

  async getTask(taskId: string): Promise<AutomationTask | null> {
    return this.tasks.get(taskId) || null
  }

  async createTask(task: Omit<AutomationTask, 'id' | 'createdAt' | 'updatedAt'>): Promise<AutomationTask> {
    const newTask: AutomationTask = {
      id: crypto.randomUUID(),
      ...task,
      createdAt: new Date(),
      updatedAt: new Date(),
      executionCount: 0,
      failureCount: 0,
    }
    this.tasks.set(newTask.id, newTask)
    return newTask
  }

  async updateTask(taskId: string, updates: Partial<AutomationTask>): Promise<AutomationTask | null> {
    const task = this.tasks.get(taskId)
    if (!task) return null
    
    const updated = { ...task, ...updates, updatedAt: new Date() }
    this.tasks.set(taskId, updated)
    return updated
  }

  async deleteTask(taskId: string): Promise<boolean> {
    return this.tasks.delete(taskId)
  }

  async getActiveTasks(): Promise<AutomationTask[]> {
    return Array.from(this.tasks.values()).filter(t => t.isActive && t.status === 'pending')
  }

  // ==================== POST OPERATIONS ====================

  async getUserPosts(userId: string, limit = 50): Promise<ScheduledPost[]> {
    return Array.from(this.posts.values())
      .filter(p => p.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
  }

  async getPost(postId: string): Promise<ScheduledPost | null> {
    return this.posts.get(postId) || null
  }

  async createPost(post: Omit<ScheduledPost, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScheduledPost> {
    const newPost: ScheduledPost = {
      id: crypto.randomUUID(),
      ...post,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    this.posts.set(newPost.id, newPost)
    return newPost
  }

  async updatePost(postId: string, updates: Partial<ScheduledPost>): Promise<ScheduledPost | null> {
    const post = this.posts.get(postId)
    if (!post) return null
    
    const updated = { ...post, ...updates, updatedAt: new Date() }
    this.posts.set(postId, updated)
    return updated
  }

  async deletePost(postId: string): Promise<boolean> {
    return this.posts.delete(postId)
  }

  async getScheduledPosts(userId: string, startDate: Date, endDate: Date): Promise<ScheduledPost[]> {
    return Array.from(this.posts.values()).filter(p => 
      p.userId === userId && 
      p.scheduledFor >= startDate && 
      p.scheduledFor <= endDate &&
      p.status === 'scheduled'
    )
  }

  // ==================== EXECUTION OPERATIONS ====================

  async recordExecution(execution: Omit<TaskExecution, 'id'>): Promise<TaskExecution> {
    const newExecution: TaskExecution = {
      id: crypto.randomUUID(),
      ...execution,
    }
    this.executions.set(newExecution.id, newExecution)
    return newExecution
  }

  async getTaskExecutions(taskId: string, limit = 100): Promise<TaskExecution[]> {
    return Array.from(this.executions.values())
      .filter(e => e.taskId === taskId)
      .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())
      .slice(0, limit)
  }

  // ==================== UTILITY METHODS ====================

  async clearAllData(): Promise<void> {
    this.users.clear()
    this.accounts.clear()
    this.tasks.clear()
    this.posts.clear()
    this.executions.clear()
  }

  getStats() {
    return {
      totalUsers: this.users.size,
      totalAccounts: this.accounts.size,
      totalTasks: this.tasks.size,
      totalPosts: this.posts.size,
      totalExecutions: this.executions.size,
    }
  }
}

// Singleton instance
export const db = new InMemoryDB()

// ==================== DATABASE HELPER FUNCTIONS ====================

export async function ensureUserExists(userId: string): Promise<User> {
  let user = await db.getUser(userId)
  if (!user) {
    user = await db.createUser({
      email: `user-${userId}@socialflow.app`,
      name: 'User',
    })
  }
  return user
}

export async function getOrCreateAccount(
  userId: string,
  platform: SocialPlatform,
  accountId: string,
  username: string
): Promise<PlatformAccount> {
  const accounts = await db.getUserAccounts(userId)
  const existing = accounts.find(a => a.platform === platform && a.accountId === accountId)
  
  if (existing) return existing

  return db.createAccount({
    userId,
    platform,
    accountId,
    username,
    displayName: username,
    authType: 'manual',
    isActive: true,
    credentials: {},
  })
}
