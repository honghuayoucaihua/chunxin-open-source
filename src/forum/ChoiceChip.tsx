import React from 'react';

interface ChoiceChipProps {
  active: boolean;
  label: string;
  onClick: () => void;
}

const ChoiceChip: React.FC<ChoiceChipProps> = ({ active, label, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-[13px] whitespace-nowrap transition-all border ${active ? 'text-white border-transparent shadow-sm' : 'render-bg-primary render-text-secondary render-border-subtle'}`}
      style={active ? { backgroundColor: 'var(--app-accent-color)' } : {}}
    >
      {label}
    </button>
  );
};

export default ChoiceChip;
