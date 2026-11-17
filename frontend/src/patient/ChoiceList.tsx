type Choice = { id: number; label: string; line: string };

type ChoiceListProps = { choices: Choice[]; onChoose: (id: number) => void };

/** A directory board: one row per option, marked with the colour of its line. */
export function ChoiceList({ choices, onChoose }: ChoiceListProps) {
  return (
    <ul className="divide-y divide-rule border-y border-rule bg-paper">
      {choices.map((choice) => (
        <li key={choice.id}>
          <button
            type="button"
            onClick={() => {
              onChoose(choice.id);
            }}
            className="flex min-h-14 w-full items-stretch gap-4 text-left text-lg font-bold hover:bg-ground"
          >
            <span
              aria-hidden="true"
              className="w-2.5 shrink-0"
              style={{ background: choice.line }}
            />
            <span className="self-center py-3">{choice.label}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
