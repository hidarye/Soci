import {
  AutomationTask,
  ScheduledPost,
  ContentItem,
  ExecutionError,
  TaskExecution,
  PlatformAccount,
  SocialPlatform,
} from './types'
import { db } from './db'
import { platformManager } from './platform-manager'

/**
 * Automation Engine - Handles task execution, scheduling, and content transformation
 */
export class AutomationEngine {
  /**
   * Execute a single automation task
   */
  async executeTask(task: AutomationTask, accounts: Map<string, PlatformAccount>): Promise<TaskExecution> {
    const startTime = Date.now()
    const errors: ExecutionError[] = []
    let itemsProcessed = 0
    let itemsFailed = 0

    try {
      // Get source accounts
      const sourceAccounts = Array.from(task.sourceAccountIds)
        .map(id => accounts.get(id))
        .filter((a): a is PlatformAccount => a !== undefined)

      if (sourceAccounts.length === 0) {
        throw new Error('No valid source accounts found')
      }

      // Get destination accounts
      const destAccounts = Array.from(task.destinationAccountIds)
        .map(id => accounts.get(id))
        .filter((a): a is PlatformAccount => a !== undefined)

      if (destAccounts.length === 0) {
        throw new Error('No valid destination accounts found')
      }

      // Initialize platform clients
      for (const account of [...sourceAccounts, ...destAccounts]) {
        try {
          await platformManager.initializeClient(account)
        } catch (error) {
          errors.push({
            platform: account.platform,
            accountId: account.id,
            code: 'CLIENT_INIT_ERROR',
            message: `Failed to initialize client: ${error instanceof Error ? error.message : 'Unknown error'}`,
            timestamp: new Date(),
            retryable: true,
          })
        }
      }

      // For now, we'll process one item (in production, you'd fetch from source platforms)
      itemsProcessed = 1

      // Get content to distribute (example)
      const contentToDistribute: ContentItem = {
        type: 'text',
        text: 'Automated cross-platform post from SocialFlow',
      }

      // Distribute to destination accounts
      const results = await platformManager.distributeContent(
        destAccounts,
        contentToDistribute,
        (text, platform) => this.transformContent(text, platform, task)
      )

      // Check results
      for (const result of results) {
        if (!result.result.success) {
          itemsFailed++
          errors.push({
            platform: result.platform,
            accountId: result.accountId,
            code: 'PUBLISH_ERROR',
            message: result.result.error || 'Unknown error',
            timestamp: new Date(),
            retryable: true,
          })
        }
      }

      // Update task statistics
      await db.updateTask(task.id, {
        executionCount: task.executionCount + 1,
        failureCount: task.failureCount + itemsFailed,
        lastError: itemsFailed > 0 ? errors[0]?.message : undefined,
      })
    } catch (error) {
      itemsFailed++
      const message = error instanceof Error ? error.message : 'Unknown error'
      errors.push({
        platform: 'unknown',
        accountId: '',
        code: 'EXECUTION_ERROR',
        message,
        timestamp: new Date(),
        retryable: true,
      })
    }

    const duration = Date.now() - startTime

    return {
      id: crypto.randomUUID(),
      taskId: task.id,
      status: itemsFailed === 0 ? 'success' : itemsFailed === itemsProcessed ? 'failed' : 'partial',
      startedAt: new Date(Date.now() - duration),
      completedAt: new Date(),
      duration,
      itemsProcessed,
      itemsFailed,
      errors,
    }
  }

  /**
   * Transform content for different platforms
   */
  private transformContent(text: string, platform: SocialPlatform, task: AutomationTask): string {
    const { contentTransformation } = task

    let transformed = text

    // Apply text transformations
    if (contentTransformation.textTransform) {
      switch (contentTransformation.textTransform) {
        case 'uppercase':
          transformed = transformed.toUpperCase()
          break
        case 'lowercase':
          transformed = transformed.toLowerCase()
          break
        case 'capitalize':
          transformed = transformed.charAt(0).toUpperCase() + transformed.slice(1)
          break
      }
    }

    // Add platform-specific hashtags
    if (contentTransformation.addHashtags && contentTransformation.addHashtags.length > 0) {
      transformed += '\n\n' + contentTransformation.addHashtags.join(' ')
    }

    // Add custom text
    if (contentTransformation.appendText) {
      transformed += '\n' + contentTransformation.appendText
    }

    if (contentTransformation.prependText) {
      transformed = contentTransformation.prependText + '\n' + transformed
    }

    // Apply platform-specific text limits
    const maxLength = this.getPlatformMaxLength(platform)
    if (contentTransformation.maxLength) {
      const limit = Math.min(contentTransformation.maxLength, maxLength)
      if (transformed.length > limit) {
        transformed = transformed.substring(0, limit - 3) + '...'
      }
    } else if (transformed.length > maxLength) {
      transformed = transformed.substring(0, maxLength - 3) + '...'
    }

    // Add source attribution if enabled
    if (contentTransformation.includeSource) {
      transformed += '\n\n[Cross-posted via SocialFlow]'
    }

    return transformed
  }

  /**
   * Get character limit for platform
   */
  private getPlatformMaxLength(platform: SocialPlatform): number {
    switch (platform) {
      case 'twitter':
        return 280
      case 'tiktok':
        return 2200
      case 'instagram':
        return 2200
      case 'facebook':
        return 63206
      case 'youtube':
        return 5000
      case 'telegram':
        return 4096
      case 'linkedin':
        return 3000
      case 'threads':
        return 500
      default:
        return 10000
    }
  }

  /**
   * Schedule a task to run at specific times
   */
  scheduleTask(task: AutomationTask): Date | null {
    if (!task.schedule) return null

    const schedule = task.schedule
    let nextRun = new Date()

    switch (schedule.frequency) {
      case 'once':
        // Already scheduled, just return the scheduled time
        return task.nextScheduledRun || null

      case 'hourly':
        nextRun.setHours(nextRun.getHours() + 1)
        break

      case 'daily':
        if (schedule.timeOfDay) {
          const [hours, minutes] = schedule.timeOfDay.split(':').map(Number)
          nextRun.setHours(hours, minutes, 0, 0)
          if (nextRun <= new Date()) {
            nextRun.setDate(nextRun.getDate() + 1)
          }
        } else {
          nextRun.setDate(nextRun.getDate() + 1)
        }
        break

      case 'weekly':
        if (schedule.dayOfWeek && schedule.dayOfWeek.length > 0) {
          const today = nextRun.getDay()
          const nextDay = schedule.dayOfWeek.find(d => d > today) || schedule.dayOfWeek[0]
          const daysToAdd = (nextDay - today + 7) % 7 || 7

          nextRun.setDate(nextRun.getDate() + daysToAdd)
          if (schedule.timeOfDay) {
            const [hours, minutes] = schedule.timeOfDay.split(':').map(Number)
            nextRun.setHours(hours, minutes, 0, 0)
          }
        }
        break

      case 'monthly':
        nextRun.setMonth(nextRun.getMonth() + 1)
        if (schedule.timeOfDay) {
          const [hours, minutes] = schedule.timeOfDay.split(':').map(Number)
          nextRun.setHours(hours, minutes, 0, 0)
        }
        break
    }

    return nextRun
  }

  /**
   * Get tasks that are due to run
   */
  async getTasksDueForExecution(): Promise<AutomationTask[]> {
    const allTasks = await db.getActiveTasks()
    const now = new Date()

    return allTasks.filter(task => {
      if (!task.nextScheduledRun) return false
      return task.nextScheduledRun <= now
    })
  }

  /**
   * Process execution with retry logic
   */
  async executeWithRetry(
    task: AutomationTask,
    accounts: Map<string, PlatformAccount>,
    maxRetries = 3
  ): Promise<TaskExecution> {
    let lastError: TaskExecution | null = null

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const execution = await this.executeTask(task, accounts)

        if (execution.status === 'success' || execution.status === 'partial') {
          return execution
        }

        lastError = execution

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000 // 1s, 2s, 4s...
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      } catch (error) {
        lastError = {
          id: crypto.randomUUID(),
          taskId: task.id,
          status: 'failed',
          startedAt: new Date(),
          completedAt: new Date(),
          duration: 0,
          itemsProcessed: 0,
          itemsFailed: 1,
          errors: [
            {
              platform: 'unknown',
              accountId: '',
              code: 'EXECUTION_ERROR',
              message: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date(),
              retryable: true,
            },
          ],
        }
      }
    }

    return (
      lastError || {
        id: crypto.randomUUID(),
        taskId: task.id,
        status: 'failed',
        startedAt: new Date(),
        completedAt: new Date(),
        duration: 0,
        itemsProcessed: 0,
        itemsFailed: 1,
        errors: [
          {
            platform: 'unknown',
            accountId: '',
            code: 'UNKNOWN_ERROR',
            message: 'Max retries reached',
            timestamp: new Date(),
            retryable: false,
          },
        ],
      }
    )
  }
}

// Singleton instance
export const automationEngine = new AutomationEngine()
