import React from 'react';

type DesktopWeatherCityDialogProps = {
  cityInput: string;
  accentColor: string;
  onCityInputChange: (value: string) => void;
  onClose: () => void;
  onSave: (cityInput: string) => void;
};

export const DesktopWeatherCityDialog: React.FC<DesktopWeatherCityDialogProps> = ({
  cityInput,
  accentColor,
  onCityInputChange,
  onClose,
  onSave
}) => {
  const handleSave = () => onSave(cityInput);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-sm bg-white rounded-2xl p-6 mx-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-1 text-gray-800">设置天气城市</h3>
        <p className="text-xs text-gray-500 mb-4">留空则使用默认城市（北京）</p>
        <input
          type="text"
          value={cityInput}
          onChange={(event) => onCityInputChange(event.target.value)}
          placeholder="输入城市名称，如：上海"
          className="w-full px-4 py-3 rounded-xl bg-gray-100 text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-400 mb-4"
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              handleSave();
            }
          }}
          autoFocus
        />
        <div className="flex gap-2">
          <button
            className="flex-1 py-2.5 rounded-xl bg-gray-200 text-gray-600 text-sm"
            onClick={onClose}
          >
            取消
          </button>
          <button
            className="flex-1 py-2.5 rounded-xl text-white text-sm"
            style={{ backgroundColor: accentColor }}
            onClick={handleSave}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

export default DesktopWeatherCityDialog;
