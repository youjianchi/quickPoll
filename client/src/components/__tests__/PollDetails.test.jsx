import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PollDetails from '../PollDetails';

const basePoll = {
  id: 42,
  question: 'Preferred pizza topping?',
  created_at: '2024-09-13T12:34:56Z',
  options: [
    { id: 1, text: 'Pepperoni', votes: 5 },
    { id: 2, text: 'Mushrooms', votes: 2 },
  ],
};

describe('PollDetails', () => {
  it('returns null when no poll is provided', () => {
    const { container } = render(
      <PollDetails poll={null} onVote={() => {}} isVoting={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders poll metadata and options', () => {
    render(<PollDetails poll={basePoll} onVote={() => {}} isVoting={false} />);

    expect(screen.getByRole('heading', { name: basePoll.question })).toBeInTheDocument();
    expect(screen.getByText(/Poll #42 · Created/)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Vote' })).toHaveLength(2);
  });

  it('disables voting buttons when isVoting is true', () => {
    render(<PollDetails poll={basePoll} onVote={() => {}} isVoting />);
    expect(screen.getAllByRole('button', { name: 'Vote' })[0]).toBeDisabled();
  });

  it('calls onVote when an option button is clicked', async () => {
    const user = userEvent.setup();
    const handleVote = vi.fn();

    render(<PollDetails poll={basePoll} onVote={handleVote} isVoting={false} />);

    await user.click(screen.getAllByRole('button', { name: 'Vote' })[1]);
    expect(handleVote).toHaveBeenCalledWith(basePoll.options[1].id);
  });
});
