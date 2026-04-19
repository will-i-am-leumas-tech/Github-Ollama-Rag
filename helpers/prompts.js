function buildRepoAnswerPrompt({ repoName, question, context, selectedPath }) {
  return [
    'You are a local repository assistant.',
    '',
    `Repo: ${repoName}`,
    `Selected Path: ${selectedPath || 'none'}`,
    '',
    'Question:',
    question,
    '',
    'Relevant Context:',
    context,
    '',
    'Answer clearly, accurately, and briefly. Mention source paths when useful. If the answer is uncertain, say so.'
  ].join('\n');
}

module.exports = {
  buildRepoAnswerPrompt
};
