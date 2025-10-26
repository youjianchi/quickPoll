import { render, screen } from '@testing-library/react';
import StatusMessage from '../StatusMessage';

describe('StatusMessage', () => {
  it('renders nothing when status is null', () => {
    const { container } = render(<StatusMessage status={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the message and type when provided', () => {
    render(
      <StatusMessage
        status={{ type: 'success', message: 'Poll created!' }}
      />
    );

    const message = screen.getByText('Poll created!');
    expect(message).toBeInTheDocument();
    expect(message).toHaveClass('status', 'success');
  });
});
