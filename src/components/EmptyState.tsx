type Props = {
  title: string;
  body?: string;
  emoji?: string;
};

export const EmptyState = ({ title, body, emoji = "📦" }: Props) => (
  <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
    <div className="mb-3 text-5xl">{emoji}</div>
    <p className="text-base font-medium text-gray-800">{title}</p>
    {body && <p className="mt-1 max-w-xs text-sm text-gray-500">{body}</p>}
  </div>
);
