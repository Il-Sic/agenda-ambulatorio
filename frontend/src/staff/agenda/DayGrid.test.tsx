import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { DayGrid } from './DayGrid';

const FOUR_PM = 16 * 60;
const SIX_PM = 18 * 60;

function drawAt(now: number) {
  render(
    <DayGrid
      doctors={[]}
      range={{ start: FOUR_PM, end: SIX_PM }}
      now={now}
      selection={undefined}
      onSelect={() => undefined}
    />,
  );
}

test('the label of the present takes the place of the hour it would cover', () => {
  drawAt(17 * 60 + 1);

  expect(screen.getByText('17:01')).toBeInTheDocument();
  expect(screen.queryByText('17:00')).not.toBeInTheDocument();
  expect(screen.getByText('16:30')).toBeInTheDocument();
  expect(screen.getByText('17:30')).toBeInTheDocument();
});

test('between two half hours every hour keeps its label', () => {
  drawAt(17 * 60 + 17);

  expect(screen.getByText('17:17')).toBeInTheDocument();
  expect(screen.getByText('17:00')).toBeInTheDocument();
  expect(screen.getByText('17:30')).toBeInTheDocument();
});
