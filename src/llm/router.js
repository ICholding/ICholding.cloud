import { openrouterChat } from './openrouter.js';

const MODELS = {
  CORE: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
  REASONING: 'anthropic/claude-3.5-sonnet',
  CODE: 'openai/gpt-4o' // or 'openai/gpt-4-turbo'
};

export async function delegateTask(chatId, taskType, input) {
  let model = MODELS.CORE;
  let systemPrompt = "You are a Software Janitor core agent.";

  if (taskType === 'REASONING' || taskType === 'DEBT') {
    model = MODELS.REASONING;
    systemPrompt = "You are an expert software architect providing deep reasoning and optimization analysis.";
  } else if (taskType === 'FIX' || taskType === 'CODEFIX') {
    model = MODELS.CODE;
    systemPrompt = "You are an expert software engineer specialized in bug fixing and PR creation.";
  }

  // Implementation-specific: This would call openrouterChat with the selected model
  // For now, we return the selection or a stub
  console.log(`Delegating ${taskType} to ${model}...`);
  
  // Note: openrouterChat uses process.env.OPENROUTER_MODEL by default. 
  // We'll need to modify it or pass the model.
  return { model, systemPrompt };
}
