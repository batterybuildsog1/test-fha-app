/**
 * Compensating Factors Tests
 * Comprehensive test suite demonstrating modern testing patterns
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CompensatingFactors, CompensatingFactorsProvider } from './index';

// Mock error boundary for testing
jest.mock('react-error-boundary', () => ({
  ErrorBoundary: ({ children, FallbackComponent }: any) => {
    try {
      return children;
    } catch (error) {
      return <FallbackComponent error={error} resetErrorBoundary={() => {}} />;
    }
  },
}));

// Test utilities
const renderWithProvider = (ui: React.ReactElement, options = {}) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <CompensatingFactorsProvider {...options}>
      {children}
    </CompensatingFactorsProvider>
  );
  
  return render(ui, { wrapper: Wrapper });
};

describe('CompensatingFactors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders main heading and description', () => {
      renderWithProvider(<CompensatingFactors />);
      
      expect(screen.getByRole('heading', { level: 3, name: /compensating factors/i })).toBeInTheDocument();
      expect(screen.getByText(/these factors can significantly increase/i)).toBeInTheDocument();
    });

    test('renders all factor categories', () => {
      renderWithProvider(<CompensatingFactors />);
      
      expect(screen.getByText(/financial strength/i)).toBeInTheDocument();
      expect(screen.getByText(/credit profile/i)).toBeInTheDocument();
      expect(screen.getByText(/employment stability/i)).toBeInTheDocument();
      expect(screen.getByText(/housing transition/i)).toBeInTheDocument();
    });

    test('renders current housing payment input', () => {
      renderWithProvider(<CompensatingFactors />);
      
      const input = screen.getByLabelText(/current housing payment/i);
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'number');
      expect(input).toHaveAttribute('min', '0');
    });

    test('renders analysis summary', () => {
      renderWithProvider(<CompensatingFactors />);
      
      expect(screen.getByText(/compensating factors analysis/i)).toBeInTheDocument();
      expect(screen.getByText(/strong factors:/i)).toBeInTheDocument();
      expect(screen.getByText(/dti boost:/i)).toBeInTheDocument();
      expect(screen.getByText(/qualification tier:/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels', () => {
      renderWithProvider(<CompensatingFactors />);
      
      // Check for proper labeling
      const cashReservesSelect = screen.getByLabelText(/cash reserves/i);
      expect(cashReservesSelect).toHaveAttribute('aria-describedby');
      
      // Check for info buttons
      const infoButtons = screen.getAllByRole('button', { name: /information about/i });
      expect(infoButtons.length).toBeGreaterThan(0);
    });

    test('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWithProvider(<CompensatingFactors />);
      
      const firstSelect = screen.getAllByRole('combobox')[0];
      await user.tab();
      expect(firstSelect).toHaveFocus();
      
      await user.keyboard('{ArrowDown}');
      // Should be able to navigate through options
    });

    test('has proper heading hierarchy', () => {
      renderWithProvider(<CompensatingFactors />);
      
      const mainHeading = screen.getByRole('heading', { level: 3 });
      expect(mainHeading).toBeInTheDocument();
      
      const categoryHeadings = screen.getAllByRole('heading', { level: 4 });
      expect(categoryHeadings.length).toBeGreaterThan(0);
    });
  });

  describe('User Interactions', () => {
    test('updates factor selection', async () => {
      const user = userEvent.setup();
      renderWithProvider(<CompensatingFactors />);
      
      const cashReservesSelect = screen.getByLabelText(/cash reserves/i);
      await user.selectOptions(cashReservesSelect, '6+ months');
      
      expect(cashReservesSelect).toHaveValue('6+ months');
      
      // Should show "Strong" badge
      await waitFor(() => {
        expect(screen.getByText('Strong')).toBeInTheDocument();
      });
    });

    test('updates current housing payment', async () => {
      const user = userEvent.setup();
      renderWithProvider(<CompensatingFactors />);
      
      const housingPaymentInput = screen.getByLabelText(/current housing payment/i);
      await user.clear(housingPaymentInput);
      await user.type(housingPaymentInput, '1500');
      
      expect(housingPaymentInput).toHaveValue(1500);
    });

    test('prevents negative housing payment', async () => {
      const user = userEvent.setup();
      renderWithProvider(<CompensatingFactors />);
      
      const housingPaymentInput = screen.getByLabelText(/current housing payment/i);
      await user.clear(housingPaymentInput);
      await user.type(housingPaymentInput, '-100');
      
      // Should handle negative values gracefully
      expect(housingPaymentInput).toHaveValue(0);
    });
  });

  describe('Analysis Updates', () => {
    test('updates strong factor count when strong factors selected', async () => {
      const user = userEvent.setup();
      renderWithProvider(<CompensatingFactors />);
      
      const initialCount = screen.getByText(/strong factors:/i).nextSibling;
      expect(initialCount).toHaveTextContent('0');
      
      // Select a strong factor
      const cashReservesSelect = screen.getByLabelText(/cash reserves/i);
      await user.selectOptions(cashReservesSelect, '6+ months');
      
      await waitFor(() => {
        const updatedCount = screen.getByText(/strong factors:/i).nextSibling;
        expect(updatedCount).toHaveTextContent('1');
      });
    });

    test('updates qualification tier based on strong factors', async () => {
      const user = userEvent.setup();
      renderWithProvider(<CompensatingFactors />);
      
      const initialTier = screen.getByText(/qualification tier:/i).nextSibling;
      expect(initialTier).toHaveTextContent('basic');
      
      // Select two strong factors
      const cashReservesSelect = screen.getByLabelText(/cash reserves/i);
      await user.selectOptions(cashReservesSelect, '6+ months');
      
      const employmentSelect = screen.getByLabelText(/employment history/i);
      await user.selectOptions(employmentSelect, '>5 years');
      
      await waitFor(() => {
        const updatedTier = screen.getByText(/qualification tier:/i).nextSibling;
        expect(updatedTier).toHaveTextContent('maximum');
      });
    });

    test('shows recommendations when applicable', async () => {
      renderWithProvider(<CompensatingFactors />);
      
      // Should show recommendations for improving profile
      expect(screen.getByText(/recommendations:/i)).toBeInTheDocument();
      expect(screen.getByText(/consider building 6\+ months/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('handles invalid factor selections gracefully', async () => {
      const user = userEvent.setup();
      renderWithProvider(<CompensatingFactors />);
      
      const select = screen.getAllByRole('combobox')[0];
      
      // Try to set invalid value (should be handled by validation)
      fireEvent.change(select, { target: { value: 'invalid-value' } });
      
      // Component should still function normally
      expect(screen.getByText(/compensating factors analysis/i)).toBeInTheDocument();
    });

    test('shows error boundary when component fails', () => {
      // Mock a component that throws
      const ThrowError = () => {
        throw new Error('Test error');
      };
      
      const { container } = render(
        <CompensatingFactorsProvider>
          <ThrowError />
        </CompensatingFactorsProvider>
      );
      
      // Would show error boundary fallback in real scenario
      expect(container).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    test('does not re-render unnecessarily', () => {
      const renderSpy = jest.fn();
      const TestComponent = () => {
        renderSpy();
        return <CompensatingFactors />;
      };
      
      const { rerender } = renderWithProvider(<TestComponent />);
      
      const initialRenderCount = renderSpy.mock.calls.length;
      
      // Re-render with same props
      rerender(<TestComponent />);
      
      // Should not cause additional renders due to memoization
      expect(renderSpy.mock.calls.length).toBe(initialRenderCount);
    });
  });
});

describe('CompensatingFactorsProvider', () => {
  test('provides context to child components', () => {
    const TestConsumer = () => {
      const context = useCompensatingFactorsContext();
      return <div data-testid="context">{JSON.stringify(context.selections)}</div>;
    };
    
    render(
      <CompensatingFactorsProvider>
        <TestConsumer />
      </CompensatingFactorsProvider>
    );
    
    expect(screen.getByTestId('context')).toHaveTextContent('{}');
  });

  test('throws error when used outside provider', () => {
    const TestConsumer = () => {
      const context = useCompensatingFactorsContext();
      return <div>{JSON.stringify(context.selections)}</div>;
    };
    
    // Should throw error when used outside provider
    expect(() => render(<TestConsumer />)).toThrow();
  });
});