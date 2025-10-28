import { getServiceClient } from '../lib/supabaseClient.js';

export async function requireAuth(req, res, next) {
  const header = req.get('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      res.status(401).json({ error: 'Invalid or expired token.' });
      return;
    }

    req.user = data.user;
    next();
  } catch (error) {
    next(error);
  }
}
