import "./Settings.css";

interface SettingsProps {
  bgmVolume: number;
  sfxEnabled: boolean;
  onBgmVolumeChange: (vol: number) => void;
  onSfxToggle: () => void;
  onBack: () => void;
}

export function Settings({
  bgmVolume,
  sfxEnabled,
  onBgmVolumeChange,
  onSfxToggle,
  onBack,
}: SettingsProps) {
  return (
    <div className="settings-panel">
      <div className="settings-row">
        <label className="settings-label">Music Volume</label>
        <div className="settings-slider-row">
          <input
            type="range"
            className="settings-slider"
            min={0}
            max={100}
            value={Math.round(bgmVolume * 100)}
            onChange={(e) => onBgmVolumeChange(Number(e.target.value) / 100)}
          />
          <span className="settings-value">{Math.round(bgmVolume * 100)}%</span>
        </div>
      </div>

      <div className="settings-row">
        <label className="settings-label">Sound Effects</label>
        <button
          className={`settings-toggle ${sfxEnabled ? "settings-toggle-on" : "settings-toggle-off"}`}
          onClick={onSfxToggle}
        >
          {sfxEnabled ? "ON" : "OFF"}
        </button>
      </div>

      <button
        className="intro-btn intro-btn-back"
        onClick={onBack}
      >
        Back
      </button>
    </div>
  );
}
