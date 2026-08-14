import type { Context } from '@deepseek-ai/cordis'
import type { AskUserQuestionAnswer, AskUserQuestionRequest } from '@deepseek-ai/dsh-user-questions'

/**
 * Keyless user-questions provider: answers every question with its first
 * option — the "确认/采纳/通过" choice in the project-delivery gates — so a
 * smoke turn can prove the ask → answer → resume loop without a Web client.
 */
class MockUserQuestionProvider {
  async ask(request: AskUserQuestionRequest): Promise<AskUserQuestionAnswer> {
    return {
      answers: request.questions.map((question) => {
        const first = question.options?.[0]
        return { id: question.id, selected: first?.label === undefined ? [] : [first.label] }
      }),
    }
  }
}

export const name = 'mock-user-questions'
export const inject = ['userQuestions']

/** Register the auto-confirming answer provider. */
export function apply(ctx: Context): void {
  ctx.userQuestions.registerProvider(new MockUserQuestionProvider())
}
