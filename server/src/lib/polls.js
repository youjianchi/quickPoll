import { getServiceClient } from './supabaseClient.js';

function normalizePoll(row) {
  if (!row) {
    return null;
  }

  const options = [...(row.options ?? [])].sort((a, b) => a.id - b.id);

  return {
    id: row.id,
    question: row.question,
    created_at: row.created_at,
    created_by: row.created_by ?? null,
    options,
  };
}

export async function fetchPollById(pollId) {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('polls')
    .select('id, question, created_at, created_by, options(id, text, votes)')
    .eq('id', pollId)
    .order('id', { ascending: true, foreignTable: 'options' })
    .maybeSingle();

  if (error) {
    throw error;
  }

  return normalizePoll(data);
}

export async function createPollWithOptions({ question, options, userId }) {
  const supabase = getServiceClient();

  const { data: poll, error: pollError } = await supabase
    .from('polls')
    .insert({ question, created_by: userId })
    .select('id, question, created_at, created_by')
    .single();

  if (pollError) {
    throw pollError;
  }

  const optionPayload = options.map((text) => ({
    poll_id: poll.id,
    text,
  }));

  const { error: optionsError } = await supabase
    .from('options')
    .insert(optionPayload);

  if (optionsError) {
    await supabase.from('polls').delete().eq('id', poll.id);
    throw optionsError;
  }

  return fetchPollById(poll.id);
}

export async function voteOnOption(pollId, optionId) {
  const supabase = getServiceClient();

  const { data, error } = await supabase.rpc('vote_on_option', {
    input_poll_id: pollId,
    input_option_id: optionId,
  });

  if (error) {
    throw error;
  }

  return data === true;
}
