import { copies } from "../../../../copies";
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
        <label className="settings-label">{copies.settings.musicVolume}</label>
        <div className="settings-slider-row">
          <input
            type="range"
            className="settings-slider"
            min={0}
            max={100}
            value={Math.round(bgmVolume * 100)}
            onChange={(e) => onBgmVolumeChange(Number(e.target.value) / 100)}
            aria-label={copies.settings.musicVolumeAriaLabel}
          />
          <span className="settings-value">{Math.round(bgmVolume * 100)}%</span>
        </div>
      </div>

      <div className="settings-row">
        <label className="settings-label">{copies.settings.soundEffects}</label>
        <div className="settings-toggle-row">
          <button
            className={`settings-toggle-track ${sfxEnabled ? "settings-toggle-track-on" : "settings-toggle-track-off"}`}
            onClick={onSfxToggle}
            role="switch"
            aria-checked={sfxEnabled}
            aria-label={copies.settings.sfxToggleAriaLabel}
          >
            <span className="settings-toggle-thumb" />
          </button>
          <span className="settings-toggle-label">{sfxEnabled ? copies.settings.on : copies.settings.off}</span>
        </div>
      </div>

      <button
        className="intro-btn intro-btn-back"
        onClick={onBack}
      >
        {copies.common.back}
      </button>
    </div>
  );
}
